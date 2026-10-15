package io.aeiouofficial.snowydisplay
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class OverlaySettingsData {
 var snowfall: Double = 0.67
 var wind: Double = 0.2
 var enabled: Boolean = true
 var themeId: String = "winter-snow"
 var performanceMode: String = "balanced"
 var autoPlows: Boolean = false
}
@InvokeArg
class OverlayArgs { var settings: OverlaySettingsData? = null }
@TauriPlugin
class SnowOverlayPlugin(private val host: Activity) : Plugin(host) {
 private fun granted() = Settings.canDrawOverlays(host)
 private fun answer(invoke: Invoke, requested: Boolean = false) {
  val o=JSObject()
  o.put("granted", granted())
  o.put("running", SnowOverlayService.running)
  o.put("permissionRequested", requested)
  invoke.resolve(o)
 }
 @Command fun status(invoke: Invoke) = answer(invoke)
 @Command fun permission(invoke: Invoke) {
  if (!granted()) {
   val i=Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:" + host.packageName))
   try { host.startActivity(i) }
   catch (_:Exception) { host.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)) }
   answer(invoke,true)
  } else answer(invoke)
 }
 private fun config(i:Intent,s:OverlaySettingsData?) {
  if(s==null)return
  i.putExtra("snowfall",s.snowfall.coerceIn(0.0,1.0))
  i.putExtra("wind",s.wind.coerceIn(-1.0,1.0))
  i.putExtra("enabled",s.enabled)
  i.putExtra("themeId",s.themeId.take(64))
  i.putExtra("performanceMode",s.performanceMode)
  i.putExtra("autoPlows",s.autoPlows)
 }
 @Command fun start(invoke:Invoke) {
  if(!granted()) {invoke.reject("Grant display-over-other-apps permission first");return}
  val i=Intent(host,SnowOverlayService::class.java).setAction(SnowOverlayService.START)
  config(i,invoke.parseArgs(OverlayArgs::class.java).settings)
  try {
   if(Build.VERSION.SDK_INT>=26)host.startForegroundService(i) else host.startService(i)
   answer(invoke)
  }catch(e:Exception){invoke.reject("Overlay start failed: "+e.message)}
 }
 @Command fun update(invoke:Invoke) {
  if(SnowOverlayService.running){
   val i=Intent(host,SnowOverlayService::class.java).setAction(SnowOverlayService.UPDATE)
   config(i,invoke.parseArgs(OverlayArgs::class.java).settings)
   host.startService(i)
  }
  answer(invoke)
 }
 @Command fun stop(invoke:Invoke){
  host.stopService(Intent(host,SnowOverlayService::class.java))
  answer(invoke)
 }
}
