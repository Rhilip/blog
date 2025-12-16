---
title: 同机多NexusPHP站点改造
date: 2018-08-21 06:26:00
categories: PHP
tags: [nexusphp,php]
permalink: /archives/997/
---

虽然我不知道为什么 @NPCHK 大佬会有这种要求，但既然提了就顺带帮忙解决。Nginx以及数据库都没有什么大的问题，对应着分开就是了。但是在缓存方面需要动点手脚，否则多站点公用一个缓存会出现错乱的问题。

NP的Cache方法在 `classes\class_cache.php` 中，这个class_cache是对PHP的Memcache类的一个扩写。并在`function.php`中以include的形式引入并在全局声明。

但是可惜的是，Cache的配置并没有在`allconfig.php`文件提供，而是直接写死在了其构造中。所以我们需要增加prefix的支持。完整patch如下：

```diff
Index: classes/class_cache.php
IDEA additional info:
Subsystem: com.intellij.openapi.diff.impl.patch.CharsetEP
<+>UTF-8
===================================================================
--- classes/class_cache.php	(revision 84c8ca2263c5e16f912a48e8208f2e06642ca2be)
+++ classes/class_cache.php	(revision )
@@ -14,6 +14,7 @@
 	var $cacheWriteTimes = 0;
 	var $keyHits = array();
 	var $languageFolderArray = array();
+    var $prefix = '';
 
 	function __construct($host = 'localhost', $port = 11211) {
 		$success = $this->connect($host, $port); // Connect to memcache
@@ -163,6 +164,7 @@
 
 	// Wrapper for Memcache::set, with the zlib option removed and default duration of 1 hour
 	function cache_value($Key, $Value, $Duration = 3600){
+        $Key = $this->prefix . $Key;
 		$this->set($Key,$Value, 0, $Duration);
 		$this->cacheWriteTimes++;
 		$this->keyHits['write'][$Key] = !$this->keyHits['write'][$Key] ? 1 : $this->keyHits['write'][$Key]+1;
@@ -219,6 +221,7 @@
 
 	// Wrapper for Memcache::get. Why? Because wrappers are cool.
 	function get_value($Key) {
+        $Key = $this->prefix . $Key;
 		if($this->getClearCache()){
 			$this->delete_value($Key);
 			return false;
@@ -237,6 +240,7 @@
 
 	// Wrapper for Memcache::delete. For a reason, see above.
 	function delete_value($Key, $AllLang = false){
+        $Key = $this->prefix . $Key;
 		if ($AllLang){
 			$langfolder_array = $this->getLanguageFolderArray();
 			foreach($langfolder_array as $lf)
```

看多简单，毕竟整个cache类的底层就那么三个方法。。