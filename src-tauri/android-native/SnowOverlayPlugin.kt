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
 var particleType: String = "snow"
 var primaryColor: String = "#f2faff"
 var secondaryColor: String = "#b9ddff"
 var themeIntensity: Double = 0.65
 var accumulating: Boolean = true
 var gravity: Double = 1.0
 var cohesion: Double = 0.48
 var maxDepth: Double = 34.0
 var plowInterval: Double = 20.0
 var animationsEnabled: Boolean = true
 var decorationDensity: Double = 0.72
 var visualScale: Double = 1.0
 var reduceMotion: Boolean = false
 var showSceneObjects: Boolean = true
 var interactionMode: String = "none"
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
  o.put("powerSuspended", SnowOverlayService.powerSuspended)
  o.put("permissionRequested", requested)
  invoke.resolve(o)
 }
 @Command fun status(invoke: Invoke) = answer(invoke)
 @Command fun permission(invoke: Invoke) {
  if (granted()) { answer(invoke); return }
  // Android 11+ deliberately ignores a package: URI for overlay settings.
  // Only OUR app needs one grant: this never requests approval for other apps.
  val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
   Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
  } else {
   Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:" + host.packageName))
  }
  try {
   host.startActivity(intent)
   answer(invoke,true)
  } catch (_:Exception) {
   // OEMs may omit the standard page: fall back to OUR application details.
   try {
    host.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:" + host.packageName)))
    answer(invoke,true)
   } catch (error:Exception) {
    invoke.reject("Cannot open Snowy Display permission settings: " + error.message)
   }
  }
 }
 private fun config(i:Intent,s:OverlaySettingsData?) {
  if(s==null)return
  i.putExtra("snowfall",s.snowfall.coerceIn(0.0,1.0))
  i.putExtra("wind",s.wind.coerceIn(-1.0,1.0))
  i.putExtra("enabled",s.enabled)
  i.putExtra("themeId",s.themeId.take(64))
  i.putExtra("performanceMode",s.performanceMode)
  i.putExtra("autoPlows",s.autoPlows)
  i.putExtra("particleType",s.particleType.take(24))
  i.putExtra("primaryColor",s.primaryColor.take(12))
  i.putExtra("secondaryColor",s.secondaryColor.take(12))
  i.putExtra("themeIntensity",s.themeIntensity.coerceIn(0.0,1.0))
  i.putExtra("accumulating",s.accumulating)
  i.putExtra("gravity",s.gravity.coerceIn(0.2,3.0))
  i.putExtra("cohesion",s.cohesion.coerceIn(0.0,1.0))
  i.putExtra("maxDepth",s.maxDepth.coerceIn(3.0,120.0))
  i.putExtra("plowInterval",s.plowInterval.coerceIn(7.0,180.0))
  i.putExtra("animationsEnabled",s.animationsEnabled)
  i.putExtra("decorationDensity",s.decorationDensity.coerceIn(0.0,1.0))
  i.putExtra("visualScale",s.visualScale.coerceIn(0.5,2.0))
  i.putExtra("reduceMotion",s.reduceMotion)
  i.putExtra("showSceneObjects",s.showSceneObjects)
  i.putExtra("interactionMode",s.interactionMode.take(32))
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
 @Command fun clear(invoke:Invoke) {
  if(SnowOverlayService.running){
   val i=Intent(host,SnowOverlayService::class.java).setAction(SnowOverlayService.CLEAR)
   host.startService(i)
  }
  answer(invoke)
 }
 @Command fun stop(invoke:Invoke){
  host.stopService(Intent(host,SnowOverlayService::class.java))
  answer(invoke)
 }
}
