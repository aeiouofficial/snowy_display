package io.aeiouofficial.snowydisplay

import android.app.Activity
import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.Context
import android.content.BroadcastReceiver
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.PowerManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

/** Android's global overlay is ONE permission for this application, never
 * individual permissions for other apps. Touches always pass through. */
class SnowOverlayService : Service() {
 companion object {
  const val START="io.aeiouofficial.snowydisplay.START"
  const val UPDATE="io.aeiouofficial.snowydisplay.UPDATE"
  const val CLEAR="io.aeiouofficial.snowydisplay.CLEAR"
  @Volatile var running=false
   private set
  @Volatile var powerSuspended=false
   private set
 }
 private var windowManager:WindowManager?=null
 private var overlay:WeatherCanvas?=null
 private var powerReceiver:BroadcastReceiver?=null
 private var thermallyPaused=false
 // Android window overlays ordinarily also cover this application's controls.
 // Hide our click-through weather canvas while our own Activity is foreground;
 // restore it when the user leaves for another app.
 private var controlsInForeground=true
 private val activityEvents=object:Application.ActivityLifecycleCallbacks {
  override fun onActivityCreated(activity:Activity,savedInstanceState:Bundle?){}
  override fun onActivityStarted(activity:Activity){}
  override fun onActivityResumed(activity:Activity){
   if(activity.packageName==packageName){
    controlsInForeground=true
    overlay?.visibility=View.INVISIBLE
    Log.i("SnowyOverlayVisibility","hidden over Snowy Display controls")
   }
  }
  override fun onActivityPaused(activity:Activity){
   if(activity.packageName==packageName){
    controlsInForeground=false
    overlay?.visibility=View.VISIBLE
    Log.i("SnowyOverlayVisibility","visible across other apps")
   }
  }
  override fun onActivityStopped(activity:Activity){}
  override fun onActivitySaveInstanceState(activity:Activity,outState:Bundle){}
  override fun onActivityDestroyed(activity:Activity){}
 }
 override fun onCreate(){
  super.onCreate()
  application.registerActivityLifecycleCallbacks(activityEvents)
 }
 private fun refreshPowerPolicy(batteryIntent:Intent?=null){
  val power=getSystemService(Context.POWER_SERVICE) as PowerManager
  val battery=batteryIntent ?: registerReceiver(null,IntentFilter(Intent.ACTION_BATTERY_CHANGED))
  val level=battery?.getIntExtra(BatteryManager.EXTRA_LEVEL,100)?:100
  val size=(battery?.getIntExtra(BatteryManager.EXTRA_SCALE,100)?:100).coerceAtLeast(1)
  val pct=(level*100/size).coerceIn(0,100)
  val temperature=(battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE,250)?:250)/10f
  // Hysteresis avoids oscillating at the thermal threshold.
  if(temperature>=43f)thermallyPaused=true
  else if(temperature<=41f)thermallyPaused=false
  val paused=!power.isInteractive || thermallyPaused || pct<=7
  val conserve=power.isPowerSaveMode || pct<=20
  if(powerSuspended!=paused){
   Log.i("SnowyOverlayPower","render suspended=$paused thermal=$thermallyPaused battery=$pct")
  }
  powerSuspended=paused
  overlay?.setPowerPolicy(paused,conserve)
 }
 private fun watchPower(){
  if(powerReceiver!=null)return
  val receiver=object:BroadcastReceiver(){
   override fun onReceive(context:Context?,intent:Intent?){
    refreshPowerPolicy(if(intent?.action==Intent.ACTION_BATTERY_CHANGED)intent else null)
   }
  }
  val filter=IntentFilter().apply {
   addAction(Intent.ACTION_SCREEN_ON)
   addAction(Intent.ACTION_SCREEN_OFF)
   addAction(Intent.ACTION_BATTERY_CHANGED)
   addAction(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED)
  }
  registerReceiver(receiver,filter)
  powerReceiver=receiver
  refreshPowerPolicy()
 }
 override fun onBind(intent:Intent?):IBinder?=null
 override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
  if(!Settings.canDrawOverlays(this)){stopSelf();return START_NOT_STICKY}
  if(intent?.action==CLEAR) {
   overlay?.clearSnow()
   return START_NOT_STICKY
  }
  // Updating a running canvas must NOT rebuild the foreground notification,
  // allocate a new layout, or call startForeground on every slider drag.
  if(intent?.action==UPDATE && overlay!=null){
   overlay?.configure(intent)
   return START_NOT_STICKY
  }
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
  if(overlay==null){
   try{
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
    view.visibility=if(controlsInForeground)View.INVISIBLE else View.VISIBLE
    windowManager?.addView(view,params)
    overlay=view
    running=true
    watchPower()
   }catch(e:Exception){
    android.util.Log.e("SnowyOverlay","Could not create Android overlay",e)
    stopSelf();return START_NOT_STICKY
   }
  }
  intent?.let{overlay?.configure(it)}
  return START_NOT_STICKY
 }
 override fun onDestroy(){
  application.unregisterActivityLifecycleCallbacks(activityEvents)
  powerReceiver?.let{try{unregisterReceiver(it)}catch(_:Exception){}}
  powerReceiver=null
  powerSuspended=false
  overlay?.release()
  overlay?.let{try{windowManager?.removeView(it)}catch(_:Exception){}}
  overlay=null;running=false
  super.onDestroy()
 }
}

private data class Particle(var x:Float,var y:Float,var r:Float,var speed:Float,var phase:Float,var variant:Int)

/** Native rendering is driven by the SAME scene catalog metadata as the
 * Tauri control preview. No theme ID silently falls back to snow. */
private class WeatherCanvas(service:Service):View(service) {
 private val brush=Paint(Paint.ANTI_ALIAS_FLAG)
 private val rng=Random(System.nanoTime())
 private val particles=ArrayList<Particle>()
 private val risingThemes=setOf("ambient-embers","halloween-embers","event-valentine",
  "advent-1","advent-2","advent-3","advent-4",
  "spring-meadow","summer-goldenhour","autumn-harvest","event-easter")
 private var depth=FloatArray(0)
 private var theme="winter-snow"
 private var mode="snow"
 private var snowRate=.67f
 private var intensity=.65f
 private var wind=.2f
 private var gravity=1f
 private var cohesion=.48f
 private var maxDepth=34f
 private var plowInterval=20f
 private var density=.72f
 private var scale=1f
 private var primary=Color.rgb(242,250,255)
 private var secondary=Color.rgb(185,221,255)
 private var enabled=true
 private var accumulating=true
 private var plows=false
 private var animations=true
 private var reducedMotion=false
 private var scenery=true
 private var quality="balanced"
 private var previous=0L
 private var elapsed=0f
 private var active=true
 private var powerPaused=false
 private var powerConstrained=false
 fun setPowerPolicy(paused:Boolean,conserve:Boolean){
  val changed=powerPaused!=paused || powerConstrained!=conserve
  powerPaused=paused
  powerConstrained=conserve
  if(changed){
   previous=0L
   invalidate()
  }
 }
 private var lastPlow=-100f
 private var plowPosition=-1f
 private var touchedBin=-1
 private var lastSize=0
 init {setWillNotDraw(false)}
 fun release(){active=false;particles.clear()}
 fun clearSnow(){depth.fill(0f);plowPosition=-1f;invalidate()}
 private fun safeColor(value:String?,fallback:Int):Int =
  try {if(value.isNullOrEmpty())fallback else Color.parseColor(value)}catch(_:IllegalArgumentException){fallback}
 fun configure(i:Intent){
  val nextTheme=i.getStringExtra("themeId")?:theme
  val nextMode=i.getStringExtra("particleType")?:mode
  if(nextTheme!=theme||nextMode!=mode) {
   particles.clear()
   depth.fill(0f)
   lastPlow=elapsed
   plowPosition=-1f
  }
  theme=nextTheme
  mode=nextMode.takeIf{it in setOf("snow","rain","petals","leaves","fireflies","embers","confetti","stars","bats")} ?: "snow"
  primary=safeColor(i.getStringExtra("primaryColor"),primary)
  secondary=safeColor(i.getStringExtra("secondaryColor"),secondary)
  snowRate=i.getDoubleExtra("snowfall",.67).toFloat().coerceIn(0f,1f)
  intensity=i.getDoubleExtra("themeIntensity",.65).toFloat().coerceIn(0f,1f)
  wind=i.getDoubleExtra("wind",.2).toFloat().coerceIn(-1f,1f)
  gravity=i.getDoubleExtra("gravity",1.0).toFloat().coerceIn(.2f,3f)
  cohesion=i.getDoubleExtra("cohesion",.48).toFloat().coerceIn(0f,1f)
  maxDepth=i.getDoubleExtra("maxDepth",34.0).toFloat().coerceIn(3f,120f)
  plowInterval=i.getDoubleExtra("plowInterval",20.0).toFloat().coerceIn(7f,180f)
  density=i.getDoubleExtra("decorationDensity",.72).toFloat().coerceIn(0f,1f)
  scale=i.getDoubleExtra("visualScale",1.0).toFloat().coerceIn(.5f,2f)
  enabled=i.getBooleanExtra("enabled",true)
  accumulating=i.getBooleanExtra("accumulating",mode=="snow")&&mode=="snow"
  plows=i.getBooleanExtra("autoPlows",false)
  animations=i.getBooleanExtra("animationsEnabled",true)
  reducedMotion=i.getBooleanExtra("reduceMotion",false)
  scenery=i.getBooleanExtra("showSceneObjects",true)
  quality=i.getStringExtra("performanceMode")?:"balanced"
  if(!accumulating)clearSnow()
  Log.i("SnowyOverlaySettings","theme=$theme mode=$mode rate=$snowRate density=$density gravity=$gravity autoPlows=$plows quality=$quality")
  invalidate()
 }
 private fun paint(color:Int=primary,alpha:Int=200,stroke:Float=1f,style:Paint.Style=Paint.Style.FILL){
  brush.color=color;brush.alpha=alpha.coerceIn(0,255);brush.strokeWidth=stroke;brush.style=style
 }
 private fun disc(c:Canvas,x:Float,y:Float,r:Float,col:Int=primary,a:Int=200){
  paint(col,a);c.drawCircle(x,y,r,brush)
 }
 private fun line(c:Canvas,x:Float,y:Float,x2:Float,y2:Float,color:Int=primary,width:Float=2f,a:Int=185){
  paint(color,a,width,Paint.Style.STROKE);c.drawLine(x,y,x2,y2,brush);brush.style=Paint.Style.FILL
 }
 private fun rectangle(c:Canvas,l:Float,t:Float,r:Float,b:Float,col:Int=primary,a:Int=200){
  paint(col,a);c.drawRect(l,t,r,b,brush)
 }
 private fun oval(c:Canvas,x:Float,y:Float,rx:Float,ry:Float,col:Int=primary,a:Int=200){
  paint(col,a);c.drawOval(x-rx,y-ry,x+rx,y+ry,brush)
 }
 private fun poly(c:Canvas,color:Int,alpha:Int,vararg points:Float){
  if(points.size<6)return
  val p=Path();p.moveTo(points[0],points[1])
  var i=2
  while(i+1<points.size){p.lineTo(points[i],points[i+1]);i+=2}
  p.close();paint(color,alpha);c.drawPath(p,brush)
 }
 override fun onSizeChanged(w:Int,h:Int,oldw:Int,oldh:Int){
  super.onSizeChanged(w,h,oldw,oldh)
  if(w>0&&h>0 && (w!=oldw||h!=oldh)){
   depth=FloatArray(max(1,w/14))
   particles.clear()
   plowPosition=-1f
   lastSize=w
  }
 }
 private fun motifs():List<String> = when(theme) {
  "winter-snow"->listOf("crystal")
  "winter-blizzard"->listOf("cloud","crystal")
  "winter-frost"->listOf("icicle","crystal")
  "winter-northernlights"->listOf("aurora","pine","moon")
  "winter-forest"->listOf("pine","bird","pine")
  "spring-petals"->listOf("branch","flower","butterfly")
  "spring-rain"->listOf("cloud","flower")
  "spring-pollen"->listOf("bee","branch","flower")
  "spring-butterflies"->listOf("butterfly","flower","butterfly")
  "spring-meadow"->listOf("flower","bee","butterfly")
  "spring-rainbow"->listOf("rainbow","cloud","bird")
  "summer-fireflies"->listOf("firefly","moon","pine")
  "summer-showers"->listOf("cloud","cloud")
  "summer-stargaze"->listOf("moon","meteor","star")
  "summer-bees"->listOf("bee","flower","sun")
  "summer-kite"->listOf("kite","cloud","sun")
  "summer-goldenhour"->listOf("sun","bird","cloud")
  "autumn-leaves"->listOf("branch","acorn","leaf")
  "autumn-mist"->listOf("mist","acorn")
  "autumn-harvest"->listOf("pumpkin","acorn","lantern")
  "autumn-migration"->listOf("bird","cloud","bird")
  "weather-thunder"->listOf("lightning","cloud")
  "weather-fog"->listOf("mist","mist","cloud")
  "weather-drizzle"->listOf("cloud","flower","cloud")
  "weather-windy"->listOf("kite","leaf","cloud")
  "halloween-bats"->listOf("moon","bat","pumpkin")
  "halloween-embers"->listOf("lantern","mist","pumpkin")
  "christmas-snow"->listOf("pine","lights","star")
  "newyear-confetti"->listOf("firework","star","firework")
  "event-easter"->listOf("flower","butterfly","sun")
  "event-valentine"->listOf("heart","flower","heart")
  "ambient-embers"->listOf("lantern","star")
  "ambient-cosmos"->listOf("meteor","moon","star")
  "ambient-moonlight"->listOf("moon","star","cloud")
  else->if(theme.startsWith("advent-")) listOf("candles","star","lights") else emptyList()
 }
 private fun drawMotif(c:Canvas,kind:String,x:Float,y:Float,s:Float,t:Float,index:Int){
  when(kind){
   "pine"->{
    line(c,x,y,x,y-s*1.5f,Color.rgb(133,112,85),3f)
    for(j in 0..2){
     val v=y-s*(1.3f-j*.32f)
     poly(c,if(j%2==0)0xff36776b.toInt() else 0xff295a60.toInt(),190,
      x,v-s*.45f,x-s*(.42f+j*.09f),v+s*.43f,x+s*(.42f+j*.09f),v+s*.43f)
    }
   }
   "flower"->{
    for(k in 0 until 5){
     val a=k*Math.PI*2/5
     oval(c,x+cos(a).toFloat()*s*.28f,y+sin(a).toFloat()*s*.28f,
      s*.21f,s*.27f,if(index%2==0)0xffefaccf.toInt() else 0xffd6bafa.toInt(),180)
    }
    disc(c,x,y,s*.15f,0xffffd17f.toInt(),235)
   }
   "butterfly"->{
    val flap=if(animations&&!reducedMotion) (.52f+.38f*sin(t*6+index)) else .72f
    oval(c,x-s*.29f,y-s*.1f,max(1f,s*.32f*flap),s*.51f,0xffefa5d3.toInt(),180)
    oval(c,x+s*.29f,y-s*.1f,max(1f,s*.32f*flap),s*.51f,0xffcdb0f2.toInt(),180)
    line(c,x,y-s*.42f,x,y+s*.38f,0xff61547b.toInt(),2f)
   }
   "bee"->{
    oval(c,x,y,s*.4f,s*.23f,0xffffd15e.toInt(),235)
    oval(c,x-s*.15f,y-s*.29f,s*.22f,s*.2f,0xffd6efff.toInt(),130)
    oval(c,x+s*.13f,y-s*.29f,s*.22f,s*.2f,0xffd6efff.toInt(),130)
    line(c,x-s*.1f,y-s*.22f,x-s*.1f,y+s*.22f,Color.DKGRAY,2f)
   }
   "bird"->{
    val wave=if(animations&&!reducedMotion)sin(t*4+index)*s*.24f else 0f
    line(c,x-s,y+wave,x,y-s*.13f,secondary,2f)
    line(c,x,y-s*.13f,x+s,y+wave,secondary,2f)
   }
   "sun"->{
    disc(c,x,y,s*.55f,0xffffdb94.toInt(),208)
    for(i in 0..7){
     val a=i*PI/4
     line(c,x+cos(a).toFloat()*s*.7f,y+sin(a).toFloat()*s*.7f,
      x+cos(a).toFloat()*s,y+sin(a).toFloat()*s,0xffffd798.toInt(),2f)
    }
   }
   "moon"->{
    val outer=Path().apply{addCircle(x,y,s*.57f,Path.Direction.CW)}
    val cutout=Path().apply{addCircle(x+s*.24f,y-s*.18f,s*.51f,Path.Direction.CW)}
    outer.op(cutout,Path.Op.DIFFERENCE)
    paint(0xffd9e4f5.toInt(),190)
    c.drawPath(outer,brush)
   }
   "cloud"->{
    oval(c,x-s*.34f,y,s*.43f,s*.24f,secondary,100)
    oval(c,x,y-s*.16f,s*.49f,s*.32f,secondary,118)
    oval(c,x+s*.36f,y,s*.4f,s*.24f,secondary,105)
   }
   "rainbow"->{
    for(i in 0..4){
     paint(listOf(0xffe99fbe,0xfff4d085,0xff9ed89b,0xff8fccef,0xffbea7eb)[i].toInt(),135,s*.065f,Paint.Style.STROKE)
     c.drawArc(x-s*(.9f-i*.12f),y-s*(.45f-i*.12f),x+s*(.9f-i*.12f),y+s*(1.4f-i*.12f),190f,160f,false,brush)
    }
   }
   "kite"->{
    poly(c,if(index%2==0)0xffe9a16e.toInt() else 0xffbaade8.toInt(),213,
     x,y-s,x+s*.4f,y,x,y+s*.72f,x-s*.4f,y)
    line(c,x,y+s*.72f,x+s*.16f,y+s*2f,secondary,1.4f)
   }
   "branch"->{
    line(c,x-s,y+s*.1f,x+s,y-s*.4f,0xffa97a5a.toInt(),2.4f)
    for(i in 0..3)disc(c,x-s*.65f+i*s*.46f,y-s*.19f-i*s*.1f,s*.12f,secondary,195)
   }
   "leaf"->oval(c,x,y,s*.38f,s*.17f,0xffdda45f.toInt(),200)
   "acorn"->{
    oval(c,x,y,s*.22f,s*.32f,0xffb47a50.toInt(),215)
    oval(c,x,y-s*.22f,s*.27f,s*.12f,0xff70513e.toInt(),210)
   }
   "pumpkin"->{
    for(i in -2..2)oval(c,x+i*s*.13f,y,s*.22f,s*.34f,0xffe47f36.toInt(),210)
    line(c,x,y-s*.26f,x+s*.06f,y-s*.54f,0xff5b814b.toInt(),3f)
   }
   "bat"->{
    val wave=if(animations&&!reducedMotion)sin(t*5+index)*s*.27f else 0f
    poly(c,0xffb5a2d2.toInt(),225,x-s,y-s*.15f,x-s*.5f,y-s*.35f-wave,
     x,y,x+s*.5f,y-s*.35f-wave,x+s,y-s*.15f,x+s*.38f,y+s*.2f,x,y+s*.09f,x-s*.38f,y+s*.2f)
   }
   "lantern"->{
    rectangle(c,x-s*.25f,y-s*.27f,x+s*.25f,y+s*.31f,0xffb97443.toInt(),224)
    rectangle(c,x-s*.12f,y-s*.14f,x+s*.12f,y+s*.2f,0xffffd88f.toInt(),235)
   }
   "aurora"->{
    for(i in 0..2){
     val base=y+i*s*.28f
     for(j in 0..16){
      val x1=x-s*2+j*s*.25f
      val xx=x1+s*.25f
      val y1=base+sin(t*.7f+j*.4f+i)*s*.18f
      val y2=base+sin(t*.7f+(j+1)*.4f+i)*s*.18f
      line(c,x1,y1,xx,y2,if(i%2==0)0xff63eac5.toInt() else 0xff9a83d8.toInt(),s*.14f,88)
     }
    }
   }
   "icicle"->for(i in 0..3)poly(c,0xffbcddf9.toInt(),190,
    x+s*(i-1.5f)*.36f-s*.13f,y,
    x+s*(i-1.5f)*.36f+s*.13f,y,
    x+s*(i-1.5f)*.36f,y+s*(.4f+i%3*.23f))
   "crystal"->for(i in 0..2) {
    val a=i*PI/3
    line(c,x-cos(a).toFloat()*s*.6f,y-sin(a).toFloat()*s*.6f,
     x+cos(a).toFloat()*s*.6f,y+sin(a).toFloat()*s*.6f,0xffd9edfc.toInt(),1.8f)
   }
   "star"->{
    line(c,x-s*.5f,y,x+s*.5f,y,primary,2f)
    line(c,x,y-s*.5f,x,y+s*.5f,primary,2f)
   }
   "firefly"->disc(c,x,y,max(2f,s*.12f),0xffe3fa9d.toInt(),215)
   "meteor"->{
    line(c,x-s*1.7f,y-s*.7f,x,y,secondary,2f)
    disc(c,x,y,s*.13f,primary,216)
   }
   "firework"->for(i in 0..11){
    val a=i*PI/6
    line(c,x+cos(a).toFloat()*s*.3f,y+sin(a).toFloat()*s*.3f,
     x+cos(a).toFloat()*s*.9f,y+sin(a).toFloat()*s*.9f,
     if(index%2==0)primary else secondary,2f)
   }
   "lights"->for(i in -3..3){
    disc(c,x+i*s*.34f,y+sin(i*.9f)*s*.18f,s*.08f,
     if(i%2==0)0xffffd78f.toInt() else 0xffb8e9db.toInt(),200)
   }
   "candles"->{
    val howMany=theme.substringAfter("advent-","1").toIntOrNull()?.coerceIn(1,4)?:1
    for(i in 0 until howMany){
     val offset=(i-(howMany-1)/2f)*s*.61f
     rectangle(c,x+offset-s*.18f,y-s*.8f,x+offset+s*.18f,y+s*.27f,
      if(i==2)0xffe6abc0.toInt() else 0xffe9c2a4.toInt(),210)
     oval(c,x+offset+sin(t*2+i)*s*.03f,y-s*.98f,s*.09f,s*.23f,0xffffd38a.toInt(),235)
    }
   }
   "lightning"->{
    val flash=if(animations&&!reducedMotion) (sin(t*1.2f)> .96f) else false
    if(flash) {
     line(c,x,y-s,x-s*.2f,y-s*.18f,0xffdce7ff.toInt(),3f)
     line(c,x-s*.2f,y-s*.18f,x+s*.1f,y-s*.2f,0xffdce7ff.toInt(),3f)
     line(c,x+s*.1f,y-s*.2f,x-s*.25f,y+s,0xffdce7ff.toInt(),3f)
    }
   }
   "mist"->for(i in 0..2)oval(c,x+(i-1)*s*.5f,y,s*.7f,s*.16f,0xffd9e8ec.toInt(),48)
   "heart"->{
    disc(c,x-s*.18f,y-s*.15f,s*.25f,0xffefacc8.toInt(),174)
    disc(c,x+s*.18f,y-s*.15f,s*.25f,0xffefacc8.toInt(),174)
    poly(c,0xffefacc8.toInt(),174,x-s*.42f,y,x+s*.42f,y,x,y+s*.51f)
   }
  }
 }
 private fun drawDecorations(c:Canvas,w:Float,h:Float){
  if(!scenery||density<=0f)return
  // Fullscreen overlays are transparent weather, NOT a seasonal wallpaper.
  // Trees, houses, flowers, pumpkins and other scenery only belong to the
  // in-app preview. Render at most two lightweight atmospheric accents here.
  val features=motifs().filter{it in setOf(
   "aurora","lightning","rainbow","firework","meteor","butterfly",
   "bee","bird","kite","bat","firefly","moon","sun","cloud","lights","mist",
   "candles","star","lantern","pumpkin","leaf","acorn","flower")}
  if(features.isEmpty())return
  val maxDraw=(5*density).toInt().coerceIn(0,5)
  val t=if(animations&&!reducedMotion)elapsed else 0f
  for(i in 0 until maxDraw){
   val k=features[i%features.size]
   val x=70f+((i*503+theme.length*37)%(max(1,width-140))).toFloat()
   val y=if(k in setOf("moon","sun","cloud","aurora","rainbow","meteor","star","lightning","firework","lights","icicle"))
    42f+(i%4)*56f
   else if(k in setOf("pine","branch","flower","pumpkin","acorn","lantern","candles","leaf"))
    h-45f-(i%2)*23f
   else 115f+((i*191)%(max(1,height-350))).toFloat()
   val motion=if(k in setOf("bee","butterfly","bird","bat","kite","firefly","meteor")&&animations&&!reducedMotion)
     sin(t*(if(k=="butterfly")2.8f else .72f)+i)*17f else 0f
   drawMotif(c,k,x,y+motion,(16f+(i%3)*6f)*scale,t,i)
  }
 }
  // Each catalog theme owns a foreground glyph pair; no generic snow/dot fallback.
  // The shared glyph vocabulary is a drawing primitive library, NOT a shared effect.
  private fun themeGlyphs():Pair<String,String> = when(theme){
   "winter-snow"->"flake" to "ice-star"
   "winter-blizzard"->"snow-streak" to "ice-shard"
   "winter-frost"->"ice-star" to "ice-shard"
   "winter-northernlights"->"ice-shard" to "star"
   "winter-forest"->"needle" to "flake"
   "spring-petals"->"petal" to "seed"
   "spring-rain"->"rain" to "prism"
   "spring-pollen"->"pollen" to "seed"
   "spring-butterflies"->"butterfly" to "petal"
   "spring-meadow"->"seed" to "pollen"
   "spring-rainbow"->"prism" to "rain"
   "summer-fireflies"->"firefly" to "pollen"
   "summer-showers"->"downpour" to "rain"
   "summer-stargaze"->"star" to "meteor"
   "summer-bees"->"bee" to "pollen"
   "summer-kite"->"ribbon" to "seed"
   "summer-goldenhour"->"sun-dust" to "seed"
   "autumn-leaves"->"maple" to "needle"
   "autumn-mist"->"leaf-fog" to "grain"
   "autumn-harvest"->"lantern" to "grain"
   "autumn-migration"->"bird" to "maple"
   "weather-thunder"->"lightning" to "downpour"
   "weather-fog"->"fog" to "leaf-fog"
   "weather-drizzle"->"drizzle" to "prism"
   "weather-windy"->"gust" to "maple"
   "halloween-bats"->"bat" to "wisp"
   "halloween-embers"->"wisp" to "lantern"
   "advent-1"->"candle" to "sparkler"
   "advent-2"->"sparkler" to "candle"
   "advent-3"->"candle" to "heart"
   "advent-4"->"star" to "candle"
   "christmas-snow"->"gift" to "flake"
   "newyear-confetti"->"confetti" to "sparkler"
   "event-easter"->"egg" to "butterfly"
   "event-valentine"->"heart" to "sparkler"
   "ambient-embers"->"flame" to "sparkler"
   "ambient-cosmos"->"galaxy" to "meteor"
   "ambient-moonlight"->"crescent" to "star"
   else->"flake" to "ice-star"
  }
  private fun particleMotion(p:Particle,dt:Float):Pair<Float,Float> {
   val time=elapsed+p.phase
   val breezy=wind*35f
   return when(theme){
    "winter-blizzard"->(breezy*3.5f+p.speed*.65f) to (p.speed*1.7f*gravity)
    "winter-frost"->sin(time*.5f)*3f to sin(time*.7f)*2f
    "winter-northernlights"->sin(time*.6f)*10f to p.speed*.15f*gravity
    "spring-petals"->(breezy*.9f+sin(time*1.8f)*23f) to (p.speed*.42f*gravity)
    "spring-butterflies"->cos(time*2.5f)*38f to sin(time*3.1f)*24f
    "spring-pollen"->sin(time*1.4f)*12f to sin(time*1.2f)*9f
    "spring-meadow"->sin(time*.8f)*13f to -p.speed*.16f
    "spring-rainbow"->sin(time*.7f)*8f to p.speed*.16f
    "summer-fireflies"->sin(time*1.5f)*19f to cos(time*1.7f)*15f
    "summer-showers"->(breezy+p.speed*.08f) to p.speed*3.4f*gravity
    "summer-stargaze"->0f to 0f
    "summer-bees"->(cos(time*3.5f)*30f) to (sin(time*2.7f)*23f)
    "summer-kite"->(breezy*1.3f+sin(time)*14f) to sin(time*.7f)*19f
    "summer-goldenhour"->sin(time*.4f)*6f to -p.speed*.08f
    "autumn-leaves"->(breezy*1.4f+sin(time*1.7f)*23f) to p.speed*.54f*gravity
    "autumn-mist"->sin(time*.6f)*13f to cos(time*.4f)*4f
    "autumn-harvest"->sin(time*.8f)*10f to -p.speed*.23f
    "autumn-migration"->(p.speed*.5f) to sin(time*2f)*5f
    "weather-thunder"->(breezy*2.2f+p.speed*.25f) to (p.speed*3.5f*gravity)
    "weather-fog"->(breezy*.2f+sin(time*.4f)*8f) to sin(time*.33f)*3f
    "weather-drizzle"->breezy*.25f to p.speed*2.1f*gravity
    "weather-windy"->(breezy*3f+p.speed*.6f) to sin(time*2.1f)*15f
    "halloween-bats"->(p.speed*.9f) to sin(time*3.6f)*24f
    "halloween-embers"->sin(time*.9f)*13f to -p.speed*.28f
    "ambient-embers"->sin(time*1.4f)*7f to -p.speed*.75f
    "ambient-cosmos"->cos(time*.35f)*5f to sin(time*.4f)*6f
    "ambient-moonlight"->sin(time*.45f)*7f to sin(time*.6f)*3f
    "event-easter"->sin(time*1.5f)*16f to -p.speed*.11f
    "event-valentine"->sin(time*1.2f)*15f to -p.speed*.22f
    "newyear-confetti"->(breezy+sin(time*2.4f)*28f) to p.speed*.9f*gravity
    "advent-1"->sin(time)*2f to -p.speed*.1f
    "advent-2"->sin(time*1.3f)*4f to -p.speed*.14f
    "advent-3"->sin(time*1.2f)*5f to -p.speed*.15f
    "advent-4"->sin(time*1.7f)*8f to -p.speed*.2f
    "christmas-snow"->sin(time*.8f)*8f to p.speed*.37f*gravity
    "spring-rain"->breezy*.5f to p.speed*2.3f*gravity
    "winter-forest"->sin(time*.7f)*5f to p.speed*.35f*gravity
    "winter-snow"->(breezy*.35f+sin(time*.85f)*9f) to p.speed*.65f*gravity
    else->breezy to p.speed*gravity
   }
  }
  private fun uniqueGlyph(c:Canvas,kind:String,x:Float,y:Float,s:Float,tint:Int,phase:Float){
   val s0=s.coerceIn(1.25f,30f)
   val t=if(animations&&!reducedMotion)elapsed+phase else phase
   when(kind){
    "flake","ice-star"->{
     val arms=if(kind=="flake")6 else 4
     for(i in 0 until arms){
      val a=i*Math.PI/arms
      line(c,x-cos(a).toFloat()*s0,y-sin(a).toFloat()*s0,
       x+cos(a).toFloat()*s0,y+sin(a).toFloat()*s0,tint,1.2f,230)
      if(kind=="flake"){
       line(c,x+cos(a).toFloat()*s0*.55f,y+sin(a).toFloat()*s0*.55f,
        x+cos(a+.42).toFloat()*s0*.67f,y+sin(a+.42).toFloat()*s0*.67f,tint,.9f,170)
      }
     }
    }
    "snow-streak","rain","downpour","drizzle"->{
     val length=when(kind){"snow-streak"->4f;"downpour"->9f;"drizzle"->2f;else->6f}*s0
     line(c,x-length*.17f,y-length*.45f,x+length*.17f,y+length*.55f,tint,
      if(kind=="downpour")1.8f else if(kind=="drizzle").7f else 1.15f,198)
     if(kind=="rain"||kind=="downpour")oval(c,x,y+length*.55f,s0*.3f,s0*.12f,tint,110)
    }
    "ice-shard","needle","grain"->poly(c,tint,210,
      x,y-s0,x+s0*.32f,y-s0*.18f,x+s0*.16f,y+s0,
      x-s0*.25f,y+s0*.56f)
    "petal"->{
     val path=Path()
     path.moveTo(x,y-s0)
     path.cubicTo(x+s0,y-s0*.8f,x+s0,y+s0*.65f,x,y+s0)
     path.cubicTo(x-s0,y+s0*.65f,x-s0,y-s0*.8f,x,y-s0)
     paint(tint,206);c.drawPath(path,brush)
     line(c,x,y-s0*.5f,x,y+s0*.55f,Color.WHITE,.55f,74)
    }
    "pollen","seed"->{
     if(kind=="seed"){
      oval(c,x,y,s0*.28f,s0*.55f,tint,205)
      line(c,x,y,x+s0*.6f,y-s0*.85f,tint,.7f,170)
     }else for(i in 0..6){
      val a=i*Math.PI*2/7+t*.08
      line(c,x,y,x+cos(a).toFloat()*s0*.8f,
       y+sin(a).toFloat()*s0*.8f,tint,1.1f,195)
     }
    }
    "butterfly"->drawMotif(c,"butterfly",x,y,s0*1.35f,t,phase.toInt())
    "prism"->{
     poly(c,tint,145,x,y-s0,x+s0*.75f,y+s0*.6f,x-s0*.75f,y+s0*.6f)
     line(c,x-s0*.8f,y+s0*.5f,x+s0*.8f,y+s0*.5f,Color.WHITE,.7f,155)
    }
    "firefly","sun-dust"->{
     // Glow is only atmospheric; the actual flying insect/body is drawn.
     disc(c,x,y,s0*2f,tint,22)
     if(kind=="firefly"){
      val flap=(.45f+.55f*kotlin.math.abs(sin(t*5)))
      oval(c,x-s0*.45f,y-s0*.35f,s0*.38f*flap,s0*.65f,
       0xffe3f4fc.toInt(),150)
      oval(c,x+s0*.45f,y-s0*.35f,s0*.38f*flap,s0*.65f,
       0xffe3f4fc.toInt(),150)
      oval(c,x,y+s0*.1f,s0*.23f,s0*.62f,tint,235)
      line(c,x-s0*.12f,y-s0*.35f,x-s0*.4f,y-s0*.8f,
       0xff354a3a.toInt(),.9f,210)
      line(c,x+s0*.12f,y-s0*.35f,x+s0*.4f,y-s0*.8f,
       0xff354a3a.toInt(),.9f,210)
     }else{
      for(i in 0..7){
       val a=i*Math.PI/4
       line(c,x,y,x+cos(a).toFloat()*s0,y+sin(a).toFloat()*s0,tint,1.3f,205)
      }
     }
    }
    "meteor","sparkler"->{
     line(c,x-s0*2.8f,y-s0*2.3f,x,y,tint,1.3f,170)
     disc(c,x,y,s0*.58f,tint,235)
     line(c,x-s0*.55f,y,x+s0*.55f,y,tint,1.2f,210)
    }
    "bee"->{
     oval(c,x,y,s0*.92f,s0*.5f,0xffffcc55.toInt(),230)
     oval(c,x-s0*.27f,y-s0*.61f,s0*.37f,s0*.3f,0xffe7faff.toInt(),126)
     oval(c,x+s0*.27f,y-s0*.61f,s0*.37f,s0*.3f,0xffe7faff.toInt(),126)
     line(c,x-s0*.2f,y-s0*.45f,x-s0*.2f,y+s0*.46f,Color.DKGRAY,1.3f)
    }
    "ribbon","gust"->{
     val path=Path()
     path.moveTo(x-s0*2,y+s0)
     path.cubicTo(x-s0,y-s0*1.2f,x+s0*.3f,y+s0,x+s0*1.6f,y-s0)
     paint(tint,180,if(kind=="gust")1.3f else 2f,Paint.Style.STROKE)
     c.drawPath(path,brush);brush.style=Paint.Style.FILL
    }
    "maple"->poly(c,tint,210,
     x,y-s0,x-s0*.25f,y-s0*.42f,x-s0*.8f,y-s0*.6f,
     x-s0*.53f,y-s0*.06f,x-s0,y+s0*.22f,x-s0*.33f,y+s0*.35f,
     x,y+s0*.72f,x+s0*.33f,y+s0*.35f,x+s0,y+s0*.22f,
     x+s0*.53f,y-s0*.06f,x+s0*.8f,y-s0*.6f,x+s0*.25f,y-s0*.42f)
    "leaf-fog","fog"->{
     val path=Path()
     for(i in 0..2){
      val yy=y+(i-1)*s0*.35f
      path.moveTo(x-s0*2.6f,yy)
      path.cubicTo(x-s0,yy-s0*.7f,x+s0,yy+s0*.7f,x+s0*2.6f,yy)
     }
     paint(tint,if(kind=="fog")70 else 115,1.4f,Paint.Style.STROKE)
     c.drawPath(path,brush)
     brush.style=Paint.Style.FILL
    }
    "bird"->{
     val wave=sin(t*4)*s0*.25f
     line(c,x-s0*1.2f,y+wave,x,y-s0*.14f,tint,1.5f)
     line(c,x,y-s0*.14f,x+s0*1.2f,y+wave,tint,1.5f)
    }
    "lightning"->poly(c,tint,230,x-s0*.2f,y-s0,
     x+s0*.48f,y-s0*.18f,x+s0*.12f,y-s0*.16f,
     x+s0*.36f,y+s0,x-s0*.44f,y+s0*.08f,x,y)
    "bat"->drawMotif(c,"bat",x,y,s0*1.3f,t,phase.toInt())
    "wisp","flame","candle"->{
     if(kind=="candle"){
      rectangle(c,x-s0*.38f,y-s0*.08f,x+s0*.38f,y+s0*1.2f,
       0xffe8d4c4.toInt(),223)
      rectangle(c,x-s0*.34f,y+s0*.02f,x-s0*.22f,y+s0*1.14f,
       secondary,110)
      line(c,x,y-s0*.04f,x,y-s0*.25f,0xff4b3e35.toInt(),1.5f,215)
     }else if(kind=="wisp") {
      // A tapered ghost-light trail, not a circle standing in for its body.
      line(c,x,y+s0*.5f,x-s0*.5f,y+s0*1.6f,tint,1.5f,95)
     }
     if(kind!="flame")disc(c,x,y-s0*.56f,s0*1.25f,tint,15)
     poly(c,tint,225,x,y-s0*1.45f,x+s0*.58f,y-s0*.34f,
      x+s0*.4f,y+s0*.5f,x,y+s0*.81f,x-s0*.4f,y+s0*.5f,x-s0*.58f,y-s0*.34f)
    }
    "gift"->{
     rectangle(c,x-s0*.66f,y-s0*.66f,x+s0*.66f,y+s0*.66f,tint,214)
     rectangle(c,x-s0*.13f,y-s0*.66f,x+s0*.13f,y+s0*.66f,secondary,220)
     rectangle(c,x-s0*.66f,y-s0*.1f,x+s0*.66f,y+s0*.1f,secondary,220)
    }
    "confetti"->{
     poly(c,tint,215,x-s0*.5f,y-s0,x+s0*.65f,y-s0*.66f,
      x+s0*.4f,y+s0,x-s0*.8f,y+s0*.6f)
    }
    "galaxy"->{
     disc(c,x,y,s0*2.9f,tint,26)
     paint(tint,167,1.3f,Paint.Style.STROKE)
     c.drawOval(x-s0*1.6f,y-s0*.53f,x+s0*1.6f,y+s0*.53f,brush)
     brush.style=Paint.Style.FILL
     disc(c,x,y,s0*.26f,tint,231)
    }
    "crescent"->{
     paint(tint,200);val path=Path()
     path.addCircle(x,y,s0,Path.Direction.CW)
     val hollow=Path();hollow.addCircle(x+s0*.37f,y-s0*.18f,s0*.78f,Path.Direction.CW)
     path.op(hollow,Path.Op.DIFFERENCE)
     c.drawPath(path,brush)
    }
    "egg"->{
     oval(c,x,y,s0*.66f,s0,tint,205)
     line(c,x-s0*.42f,y+s0*.12f,x+s0*.42f,y+s0*.12f,secondary,1.1f,220)
    }
    "heart"->{
     disc(c,x-s0*.36f,y-s0*.25f,s0*.5f,tint,192)
     disc(c,x+s0*.36f,y-s0*.25f,s0*.5f,tint,192)
     poly(c,tint,192,x-s0*.86f,y,x+s0*.86f,y,x,y+s0)
    }
    "lantern"->{
     disc(c,x,y,s0*2.8f,tint,35)
     rectangle(c,x-s0*.43f,y-s0*.76f,x+s0*.43f,y+s0*.78f,tint,188)
     rectangle(c,x-s0*.23f,y-s0*.5f,x+s0*.23f,y+s0*.53f,secondary,210)
    }
    "star"->{
     val star=Path()
     for(i in 0 until 10){
      val a=i*Math.PI/5-Math.PI/2
      val radius=if(i%2==0)s0 else s0*.42f
      val px=x+cos(a).toFloat()*radius
      val py=y+sin(a).toFloat()*radius
      if(i==0)star.moveTo(px,py) else star.lineTo(px,py)
     }
     star.close()
     paint(tint,220)
     c.drawPath(star,brush)
    }
    else->{ // Defensive only: tests require all 38 catalog IDs to resolve above.
      line(c,x-s0,y,x+s0,y,tint,1.1f)
    }
   }
  }
  private fun drawThemeParticle(c:Canvas,p:Particle,tint:Int,renderRadius:Float,glyphs:Pair<String,String>){
   val glyph=if(p.variant==3)glyphs.second else glyphs.first
   // Device QA (1080px Redmi): unscaled organic silhouettes read as dots.
   // The visualScale setting is already included in renderRadius; keep its
   // multiplicative effect without raising particle count, draw rate or density.
   // A Redmi draws this canvas in real display pixels, not CSS pixels.
   // The previous 0.8..13px radius made every silhouette appear as a dot.
   // These are size *floors* for readable shapes, not extra particle emissions.
   val formSize=when(glyph){
    "petal","maple"->(10f+renderRadius*2.6f).coerceIn(12f,29f)
    "butterfly","bee","bird"->(12f+renderRadius*2.0f).coerceIn(14f,27f)
    "bat"->(11f+renderRadius*1.9f).coerceIn(13f,28f)
    "seed","grain","needle"->(6f+renderRadius*1.8f).coerceIn(8f,23f)
    "fog","leaf-fog","gust","ribbon"->(11f+renderRadius*2.0f).coerceIn(13f,30f)
    "firefly","sun-dust"->(2.5f+renderRadius*.8f).coerceIn(3.5f,9f)
    "flame","wisp","candle"->(8f+renderRadius*1.8f).coerceIn(10f,25f)
    "snow-streak","rain","downpour","drizzle"->(2f+renderRadius*.85f).coerceIn(3f,10f)
    "lightning"->(12f+renderRadius*2f).coerceIn(14f,28f)
    "lantern","gift","heart","egg"->(9f+renderRadius*2.0f).coerceIn(11f,28f)
    "galaxy","meteor","sparkler"->(8f+renderRadius*1.6f).coerceIn(10f,25f)
    "pollen"->(2.5f+renderRadius*.8f).coerceIn(3.5f,10f)
    "confetti","prism"->(8f+renderRadius*1.5f).coerceIn(10f,23f)
    "star","ice-star","flake","ice-shard"->(6f+renderRadius*1.5f).coerceIn(7.5f,20f)
    else->(5f+renderRadius*1.5f).coerceIn(6f,23f)
   }
   // Organic tumbling/flapping has a real silhouette rotation, not circles
   // oscillating along a generic snowfall trajectory.
   val rotation=if(animations&&!reducedMotion)when(glyph){
    "petal"->sin(elapsed*1.6f+p.phase)*62f
    "maple","needle"->sin(elapsed*1.2f+p.phase)*83f
    "butterfly","bee"->sin(elapsed*3.2f+p.phase)*13f
    "confetti"->elapsed*90f+p.phase*35f
    "ribbon","seed","grain"->sin(elapsed*.8f+p.phase)*38f
    else->0f
   } else 0f
   c.save()
   if(rotation!=0f)c.rotate(rotation,p.x,p.y)
   uniqueGlyph(c,glyph,p.x,p.y,formSize,tint,p.phase)
   c.restore()
  }
  /** Scene-specific atmospheric layers are bounded to a few translucent strokes.
   * They never paint an opaque fullscreen wallpaper over another application. */
  private fun drawAtmosphere(c:Canvas,w:Float,h:Float){
   if(!scenery||reducedMotion)return
   val seconds=elapsed
   when(theme){
    "winter-blizzard"->for(i in 0..2){
     line(c,-20f,h*(.23f+i*.25f),w+20f,h*(.12f+i*.25f),secondary,2f,38)
    }
    "winter-frost"->for(i in 0..3)
     uniqueGlyph(c,"ice-star",w*(.15f+i*.23f),45f,3f,secondary,i.toFloat())
    "winter-northernlights"->for(i in 0..2){
     val y=60f+i*35f
     val tint=if(i%2==0)0xff58f4c4.toInt() else 0xffac80ee.toInt()
     for(j in 0..10){
      val x=w*j/10f
      val xx=w*(j+1)/10f
      line(c,x,y+sin(seconds*.45f+j*.6f+i)*19f,
       xx,y+sin(seconds*.45f+(j+1)*.6f+i)*19f,tint,14f,24)
     }
    }
    "spring-rainbow"->for(i in 0..3){
     paint(listOf(0xffe795ba,0xfff2d684,0xffa0e3b9,0xff83cfff)[i].toInt(),50,3f,Paint.Style.STROKE)
     c.drawArc(w*.25f,h*.12f+i*5f,w*.74f,h*.56f-i*5f,195f,145f,false,brush)
     brush.style=Paint.Style.FILL
    }
    "summer-goldenhour"->disc(c,w*.85f,h*.13f,38f,0xffffc47b.toInt(),22)
    "summer-stargaze","ambient-cosmos"->for(i in 0..2){
     val x=w*(.15f+i*.3f);val y=h*(.06f+i*.07f)
     line(c,x-15f,y-7f,x+8f,y+4f,secondary,1.3f,55)
    }
    "weather-fog","autumn-mist"->for(i in 0..2){
     val drift=sin(seconds*.26f+i)*15f
     oval(c,w*(.15f+i*.35f)+drift,h*(.3f+i*.2f),w*.29f,28f,secondary,20)
    }
    "weather-thunder"->if(sin(seconds*1.7f)>.985f){
     line(c,w*.61f,0f,w*.52f,h*.16f,0xffdfe8ff.toInt(),3f,168)
     line(c,w*.52f,h*.16f,w*.67f,h*.27f,0xffdfe8ff.toInt(),3f,168)
    }
    "weather-windy","summer-kite"->for(i in 0..2){
     val y=h*(.2f+i*.18f)
     line(c,w*.1f,y+sin(seconds+i)*7f,w*.7f,y-12f,secondary,1f,39)
    }
    "halloween-bats"->disc(c,w*.8f,65f,22f,0xffc6bcf3.toInt(),31)
    "halloween-embers"->disc(c,w*.8f,h*.4f,32f,0xffe2a572.toInt(),25)
    "newyear-confetti"->for(i in 0..1)uniqueGlyph(c,"sparkler",w*(.3f+i*.38f),h*.2f,8f,secondary,i.toFloat())
    "ambient-embers"->disc(c,w*.5f,h*.9f,26f,0xfff5a16a.toInt(),24)
    "ambient-moonlight"->disc(c,w*.85f,h*.14f,29f,0xffc0d7fc.toInt(),28)
    "advent-1","advent-2","advent-3","advent-4"->{
     val candleCount=theme.substringAfter("advent-").toIntOrNull()?.coerceIn(1,4)?:1
     for(i in 0 until candleCount)
      disc(c,w*.5f+(i-(candleCount-1)/2f)*22f,h*.84f,12f,primary,29)
    }
    else->{}
   }
  }

 private fun drawParticles(c:Canvas,w:Float,h:Float,dt:Float){
  // Mobile compositor budget: no 150-particle + 60 FPS full-screen path.
  val limit=when(quality){"eco"->12;"high"->40;else->24}
  // Snowfall is a precipitation rate, NOT a global visibility knob.
  // With snowfall at zero, leaves, stars, lanterns, bees and fireflies
  // must remain visible. Decoration density independently controls those.
  val activityRate=when(mode){
   "snow","rain"->snowRate
   else->(.45f+.55f*density)
  }
  val desired=(limit*intensity*activityRate).toInt().coerceIn(0,limit)
  while(particles.size>desired)particles.removeAt(particles.lastIndex)
  while(particles.size<desired)particles.add(Particle(
   rng.nextFloat()*w,
   if(mode=="embers")h+rng.nextFloat()*9f else rng.nextFloat()*h,
   1f+rng.nextFloat()*3f,
   35f+rng.nextFloat()*82f,rng.nextFloat()*6.28f,rng.nextInt(4)))
  val glyphs=themeGlyphs()
  for(p in particles){
   if(enabled&&!reducedMotion) {
    val beforeY=p.y
    val movement=particleMotion(p,dt)
    val vx=movement.first
    val vy=movement.second
    p.x+=vx*dt
    p.y+=vy*dt
    // Deposit once on a real collision, not once per frame near the edge.
    if(mode=="snow" && accumulating && beforeY<h-3f && p.y>=h-3f) {
     depositSnow(p.x,p.r)
    }
   }
   if(p.x < -10f)p.x=w+5f
   if(p.x>w+10f)p.x=-5f
   val ascending=theme in risingThemes
   if(p.y>h+8f || (ascending && p.y < -8f)) {
    p.x=rng.nextFloat()*w;p.y=if(ascending)h+6f else -rng.nextFloat()*55f
   }
   val tint=if(p.variant%2==0)primary else secondary
   val renderRadius=(p.r*scale).coerceIn(.7f,8f)
   drawThemeParticle(c,p,tint,renderRadius,glyphs)
  }
 }
 // A single impact conserves deposited mass across its neighboring bins.
 // Screen-width-relative bins avoid a hard-coded assumption about DPI.
 private fun depositSnow(x:Float,r:Float) {
  if(depth.isEmpty()||width<=0)return
  val bin=(x*depth.size/width.toFloat()).toInt().coerceIn(0,depth.lastIndex)
  val weights=floatArrayOf(.23f,.54f,.23f)
  var totalWeight=0f
  for(offset in -1..1)if(bin+offset in depth.indices)totalWeight+=weights[offset+1]
  if(totalWeight<=0f)return
  val mass=(r*2f+4f)*cohesion
  for(offset in -1..1) {
   val i=bin+offset
   if(i in depth.indices)depth[i]=(depth[i]+mass*weights[offset+1]/totalWeight).coerceAtMost(maxDepth)
  }
 }
 private fun relaxSnow(dt:Float) {
  if(depth.size<2||dt<=0f)return
  val slope=2f+cohesion*7f
  val maxSlip=dt*(5f+(1f-cohesion)*15f)
  // Mass-conserving avalanche relaxation: only excessive slopes move.
  for(i in 0 until depth.lastIndex) {
   val gradient=depth[i]-depth[i+1]
   if(kotlin.math.abs(gradient)<=slope)continue
   val transfer=min(kotlin.math.abs(gradient)/2f-slope/2f,maxSlip)
   if(transfer<=0f)continue
   if(gradient>0f) {
    val moved=min(depth[i],transfer)
    depth[i]-=moved;depth[i+1]=(depth[i+1]+moved).coerceAtMost(maxDepth)
   }else {
    val moved=min(depth[i+1],transfer)
    depth[i+1]-=moved;depth[i]=(depth[i]+moved).coerceAtMost(maxDepth)
   }
  }
 }
 private fun settleSnow(c:Canvas,w:Float,h:Float,dt:Float){
  if(!accumulating){depth.fill(0f);plowPosition=-1f;return}
  if(depth.isEmpty())return
  if(enabled&&!reducedMotion)relaxSnow(dt)
  if(enabled && plows && depth.any{it>5f}){
   if(plowPosition<0f && elapsed-lastPlow>=plowInterval){
    plowPosition=0f
    lastPlow=elapsed
    touchedBin=-1
   }
   if(plowPosition>=0f) {
    plowPosition+=dt*36f
    val bin=(plowPosition/14f).toInt()
    if(bin in depth.indices && bin!=touchedBin){
     touchedBin=bin
     val moved=(depth[bin]*.67f).coerceAtLeast(0f)
     var rest=moved
     for(j in bin+1..min(depth.lastIndex,bin+5)){
      val free=(maxDepth-depth[j]).coerceAtLeast(0f)
      val add=min(rest,free)
      depth[j]+=add;depth[bin]-=add;rest-=add
      if(rest<=.001f)break
     }
    }
    val x=plowPosition
    rectangle(c,x,h-31f,x+27f,h-16f,0xffe9ad53.toInt(),220)
    rectangle(c,x+7f,h-39f,x+21f,h-28f,0xff8dbed3.toInt(),235)
    disc(c,x+5f,h-14f,4f,0xff283e51.toInt(),255)
    disc(c,x+24f,h-14f,4f,0xff283e51.toInt(),255)
    poly(c,0xffbcd2de.toInt(),228,x+28f,h-24f,x+36f,h-30f,x+39f,h-11f,x+30f,h-10f)
    if(plowPosition>w+45f)plowPosition=-1f
   }
  }
  if(depth.none{it>.12f})return
  // One antialiased contour, not disconnected rectangular snow columns.
  val binWidth=w/depth.size
  val contour=Path()
  contour.moveTo(0f,h+2f)
  contour.lineTo(0f,h-depth[0])
  for(i in 1 until depth.size) {
   val left=(i-1f)*binWidth
   val mid=(i-.5f)*binWidth
   contour.quadTo(left,h-depth[i-1],mid,h-(depth[i-1]+depth[i])*.5f)
  }
  contour.lineTo(w,h-depth.last())
  contour.lineTo(w,h+2f)
  contour.close()
  paint(0xffe6f2fc.toInt(),220)
  c.drawPath(contour,brush)
  paint(0xfff4faff.toInt(),230,1.25f,Paint.Style.STROKE)
  c.drawPath(contour,brush)
  brush.style=Paint.Style.FILL
 }
 override fun onDraw(c:Canvas){
  super.onDraw(c)
  if(!active||powerPaused||!enabled)return
  val now=System.nanoTime()
  val dt=if(previous==0L).016f else ((now-previous)/1_000_000_000f).coerceIn(.004f,.065f)
  previous=now
  elapsed+=dt
  val w=width.toFloat();val h=height.toFloat()
  if(w<=0f||h<=0f)return
  drawAtmosphere(c,w,h)
  drawDecorations(c,w,h)
  drawParticles(c,w,h,dt)
  settleSnow(c,w,h,dt)
  // Never redraw while screen-off, disabled, thermally hot or critically low.
  // Battery saver and 20% or less reduce the compositor to four FPS.
  val baselineFps=when(quality){"eco"->8;"high"->20;else->12}
  val fps=if(powerConstrained)min(4,baselineFps) else baselineFps
  postInvalidateDelayed(1000L/fps)
 }
}
