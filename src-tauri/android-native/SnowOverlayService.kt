package io.aeiouofficial.snowydisplay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

class SnowOverlayService : Service() {
 companion object {
  const val START="io.aeiouofficial.snowydisplay.START"
  const val UPDATE="io.aeiouofficial.snowydisplay.UPDATE"
  @Volatile var running=false
   private set
 }
 private var windowManager:WindowManager?=null
 private var overlay:WeatherCanvas?=null
 override fun onBind(intent:Intent?):IBinder?=null
 override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
  if(!Settings.canDrawOverlays(this)){stopSelf();return START_NOT_STICKY}
  val channel="snowy-overlay"
  if(Build.VERSION.SDK_INT>=26){
   val c=NotificationChannel(channel,"Snowy Display overlay",NotificationManager.IMPORTANCE_LOW)
   getSystemService(NotificationManager::class.java).createNotificationChannel(c)
  }
  val launch=packageManager.getLaunchIntentForPackage(packageName)?:Intent(this,MainActivity::class.java)
  val pending=PendingIntent.getActivity(this,0,launch,
   PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  val notification=(if(Build.VERSION.SDK_INT>=26) Notification.Builder(this,channel)
    else Notification.Builder(this))
   .setContentTitle("Snowy Display")
   .setContentText("Weather overlay is active · tap for controls")
   .setSmallIcon(android.R.drawable.ic_menu_compass)
   .setContentIntent(pending).setOngoing(true).build()
  startForeground(1091,notification)
  if(overlay==null) {
   try {
    windowManager=getSystemService(WINDOW_SERVICE) as WindowManager
    val view=WeatherCanvas(this)
    val params=WindowManager.LayoutParams(
     WindowManager.LayoutParams.MATCH_PARENT,WindowManager.LayoutParams.MATCH_PARENT,
     if(Build.VERSION.SDK_INT>=26)WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else WindowManager.LayoutParams.TYPE_PHONE,
     WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
      or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
     PixelFormat.TRANSLUCENT)
    params.gravity=Gravity.TOP or Gravity.START
    params.setTitle("Snowy Display Weather Overlay")
    windowManager?.addView(view,params)
    overlay=view
    running=true
   }catch(e:Exception){
    android.util.Log.e("SnowyOverlay","Could not create Android overlay",e)
    stopSelf();return START_NOT_STICKY
   }
  }
  intent?.let{overlay?.configure(it)}
  return START_NOT_STICKY
 }
 override fun onDestroy(){
  overlay?.release()
  overlay?.let{try{windowManager?.removeView(it)}catch(_:Exception){}}
  overlay=null;running=false
  super.onDestroy()
 }
}

private data class Flake(var x:Float,var y:Float,var r:Float,var speed:Float,var seed:Float)
private class WeatherCanvas(service:Service):View(service) {
 private val brush=Paint(Paint.ANTI_ALIAS_FLAG)
 private val rng=Random(System.nanoTime())
 private val particles=ArrayList<Flake>()
 private var depth=FloatArray(0)
 private var theme="winter-snow"
 private var snowRate=.67f
 private var wind=.2f
 private var enabled=true
 private var plows=false
 private var quality="balanced"
 private var previous=0L
 private var time=0f
 private var active=true
 init { setWillNotDraw(false) }
 fun release(){active=false;particles.clear()}
 fun configure(i:Intent){
  snowRate=i.getDoubleExtra("snowfall",.67).toFloat().coerceIn(0f,1f)
  wind=i.getDoubleExtra("wind",.2).toFloat().coerceIn(-1f,1f)
  enabled=i.getBooleanExtra("enabled",true)
  plows=i.getBooleanExtra("autoPlows",false)
  quality=i.getStringExtra("performanceMode")?:"balanced"
  theme=i.getStringExtra("themeId")?:"winter-snow"
  invalidate()
 }
 private fun type():String=when {
  theme.contains("spring")||theme.contains("cherry")||theme.contains("easter")->"petals"
  theme.contains("autumn")||theme.contains("harvest")->"leaves"
  theme.contains("summer")||theme.contains("firefly")->"fireflies"
  theme.contains("rain")||theme.contains("drizzle")||theme.contains("thunder")->"rain"
  theme.contains("halloween")->"embers"
  else->"snow"
 }
 override fun onDraw(c:Canvas){
  super.onDraw(c)
  if(!active)return
  val now=System.nanoTime()
  val dt=if(previous==0L).016f else ((now-previous)/1_000_000_000f).coerceIn(.004f,.065f)
  previous=now;time+=dt
  val w=width.toFloat();val h=height.toFloat()
  if(w<=0f||h<=0f)return
  val mode=type()
  val maxParticles=when(quality){"eco"->55;"high"->160;else->100}
  if(enabled)while(particles.size<min(maxParticles,particles.size+max(1,(snowRate*9).toInt())))
   particles.add(Flake(rng.nextFloat()*w,-rng.nextFloat()*h,1f+rng.nextFloat()*2.3f,
    39f+rng.nextFloat()*95f,rng.nextFloat()*6.28f))
  val color=when(mode) {
   "petals"->Color.rgb(255,172,217)
   "leaves"->Color.rgb(235,159,78)
   "fireflies"->Color.rgb(255,233,120)
   "rain"->Color.rgb(162,209,244)
   "embers"->Color.rgb(255,142,78)
   else->Color.rgb(235,246,255)
  }
  brush.style=Paint.Style.FILL
  for(p in particles){
   if(enabled){
    p.x+=(wind*43f+sin(time+p.seed)*12f)*dt
    p.y+=p.speed*(if(mode=="rain")dt*3.5f else dt)
   }
   if(p.x< -5f)p.x=w+4f
   if(p.x>w+5f)p.x= -4f
   if(p.y>h+4f){p.x=rng.nextFloat()*w;p.y= -rng.nextFloat()*60f}
   brush.color=color;brush.alpha=190
   if(mode=="rain")c.drawRect(p.x,p.y,p.x+1.5f,p.y+13f,brush)
   else c.drawCircle(p.x,p.y,p.r,brush)
  }
  val count=max(1,(w/14f).toInt())
  if(depth.size!=count)depth=FloatArray(count)
  if(mode=="snow"&&enabled){
   for(p in particles)if(p.y>=h-6f){
    val bin=(p.x/14f).toInt().coerceIn(0,depth.lastIndex)
    depth[bin]=(depth[bin]+p.r*.035f).coerceAtMost(38f)
   }
  }
  if(mode=="snow"){
   brush.color=Color.rgb(230,242,252);brush.alpha=214
   for(i in depth.indices){
    val amount=depth[i]
    if(amount>0.25f)c.drawRoundRect(i*14f,h-amount,i*14f+15f,h+2f,3f,3f,brush)
   }
   if(plows&&depth.any{it>6f}){
    val x=(time*28f)%(w+40f)-35f
    brush.color=Color.rgb(245,181,75)
    c.drawRoundRect(x,h-20f,x+27f,h-9f,3f,3f,brush)
   }
  }else depth.fill(0f)
  postInvalidateDelayed(1000L/when(quality){"eco"->24;"high"->60;else->36})
 }
}
