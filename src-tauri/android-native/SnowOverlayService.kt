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
import android.graphics.Path
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
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
 }
 private var windowManager:WindowManager?=null
 private var overlay:WeatherCanvas?=null
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

private data class Particle(var x:Float,var y:Float,var r:Float,var speed:Float,var phase:Float,var variant:Int)

/** Native rendering is driven by the SAME scene catalog metadata as the
 * Tauri control preview. No theme ID silently falls back to snow. */
private class WeatherCanvas(service:Service):View(service) {
 private val brush=Paint(Paint.ANTI_ALIAS_FLAG)
 private val rng=Random(System.nanoTime())
 private val particles=ArrayList<Particle>()
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
  "winter-blizzard"->listOf("crystal")
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
  "autumn-mist"->listOf("mist","branch","acorn")
  "autumn-harvest"->listOf("pumpkin","acorn","lantern")
  "autumn-migration"->listOf("bird","branch","bird")
  "weather-thunder"->listOf("lightning","cloud")
  "weather-fog"->listOf("mist","mist","cloud")
  "weather-drizzle"->listOf("cloud","flower","cloud")
  "weather-windy"->listOf("kite","leaf","branch")
  "halloween-bats"->listOf("moon","bat","pumpkin")
  "halloween-embers"->listOf("lantern","pumpkin","bat")
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
    disc(c,x,y,s*.57f,0xffe9e5cb.toInt(),180)
    line(c,x+s*.2f,y-s*.38f,x+s*.42f,y+s*.32f,0xffbbc8e1.toInt(),3f)
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
    poly(c,0xff837296.toInt(),210,x-s,y-s*.15f,x-s*.5f,y-s*.35f-wave,
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
   drawMotif(c,k,x,y+motion,(23f+(i%3)*9f)*scale,t,i)
  }
 }
 private fun drawParticles(c:Canvas,w:Float,h:Float,dt:Float){
  // Mobile compositor budget: no 150-particle + 60 FPS full-screen path.
  val limit=when(quality){"eco"->22;"high"->72;else->40}
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
  for(p in particles){
   if(enabled&&!reducedMotion) {
    p.x+=(wind*43f+sin(elapsed+p.phase)*9f)*dt
    val factor=when(mode){"rain"->3.7f;"fireflies"->.12f;"embers"->-.65f;"stars"->.28f;else->1f}
    p.y+=p.speed*dt*factor*gravity
   }
   if(p.x < -10f)p.x=w+5f
   if(p.x>w+10f)p.x=-5f
   if(p.y>h+8f || (mode=="embers" && p.y < -8f)) {
    p.x=rng.nextFloat()*w;p.y=if(mode=="embers")h+6f else -rng.nextFloat()*55f
   }
   val tint=if(p.variant%2==0)primary else secondary
   when(mode){
    "rain"->rectangle(c,p.x,p.y,p.x+max(1.1f,p.r*.65f),p.y+11f,tint,179)
    "petals"->oval(c,p.x,p.y,p.r*2f,p.r*.95f,tint,190)
    "leaves"->{
     oval(c,p.x,p.y,p.r*2.2f,p.r*1.15f,tint,200)
     line(c,p.x-p.r,p.y,p.x+p.r,p.y,tint,1f)
    }
    "bats"->drawMotif(c,"bat",p.x,p.y,p.r*3f,elapsed,p.variant)
    "fireflies"->disc(c,p.x,p.y,p.r*.8f,tint,if(animations&&!reducedMotion) (170+65*sin(elapsed*2+p.phase)).toInt() else 210)
    "stars"->{
     line(c,p.x-p.r,p.y,p.x+p.r,p.y,tint,1.5f)
     line(c,p.x,p.y-p.r,p.x,p.y+p.r,tint,1.5f)
    }
    "confetti"->rectangle(c,p.x,p.y,p.x+p.r*2f,p.y+p.r*2f,tint,210)
    else->disc(c,p.x,p.y,p.r,tint,195)
   }
  }
 }
 private fun settleSnow(c:Canvas,w:Float,h:Float,dt:Float){
  if(!accumulating){depth.fill(0f);plowPosition=-1f;return}
  if(depth.isEmpty())return
  if(enabled) {
   for(p in particles){
    if(p.y>=h-8f){
     val bin=(p.x/14f).toInt().coerceIn(0,depth.lastIndex)
     depth[bin]=(depth[bin]+p.r*.025f*cohesion).coerceAtMost(maxDepth)
    }
   }
  }
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
  for(i in depth.indices) {
   val amount=depth[i]
   if(amount>.12f)rectangle(c,i*14f,h-amount,i*14f+15f,h+2f,0xffe6f2fc.toInt(),218)
  }
 }
 override fun onDraw(c:Canvas){
  super.onDraw(c)
  if(!active)return
  val now=System.nanoTime()
  val dt=if(previous==0L).016f else ((now-previous)/1_000_000_000f).coerceIn(.004f,.065f)
  previous=now
  elapsed+=dt
  val w=width.toFloat();val h=height.toFloat()
  if(w<=0f||h<=0f)return
  if(enabled) {
   drawDecorations(c,w,h)
   drawParticles(c,w,h,dt)
   settleSnow(c,w,h,dt)
  }
  // Rendering is on Android's main thread. Cap redraws to preserve input
  // latency and battery life; no loop at all when effects are disabled.
  if(enabled)postInvalidateDelayed(1000L/when(quality){"eco"->12;"high"->30;else->20})
 }
}
