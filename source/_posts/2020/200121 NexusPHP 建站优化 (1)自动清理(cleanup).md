---
title: NexusPHP 建站优化 (1)自动清理(cleanup)
date: 2020-01-21 09:41:22
categories: PHP
tags: [nexusphp,cleanup]
permalink: /archives/1178/
---

此文主要解决部分基于NPHP的站点在**做大**之后，因cleanup相关清理程序超时无法**正常运行**，导致出现用户等级、做种魔力无法正常更新等情况。主要可能的报错和原因为：

1. 站点使用Cloudflare作为CDN，因为清理程序运行超过100s，被强制522超时停止运行。
2. 站点Nginx设置后端超时时间过短，导致502报错。

以下讲解和代码patch均基于本人fork的官方源码 [Rhilip/NexusPHP](https://github.com/Rhilip/NexusPHP)（v1.5.beta5.20120707），不提供除本文外的任何形式的说明以及免费讲解。**如果你非NPHP架构或者你站点规模还达不到出现cleanup超时，请勿了解！！**

具体请见：[Rhilip/NexusPHP#2a833ff](https://github.com/Rhilip/NexusPHP/commit/2a833ff18a149216c63123dcd359e034f2e7e859)

-----------------

## cleanup长耗时任务分析

通过对原有`include/cleanup.php`中的`printProgress`方法进行修改，我们可以发现以下任务均为长耗时任务

- calculate seeding bonus （[做种魔力值计算](https://github.com/Rhilip/NexusPHP/blob/e97ab8f41738d550ec9dff6b1d16fc814fdb8eb5/include/cleanup.php#L36-L73)）
- update count of seeders, leechers, comments for torrents （[种子做种以及评论情况更新](https://github.com/Rhilip/NexusPHP/blob/e97ab8f41738d550ec9dff6b1d16fc814fdb8eb5/include/cleanup.php#L109-L144)）

具体耗时视站内做种人数以及种子相关表大小而定，一般来说如果NPHP宿主机性能较差，在peers表突破1w行之后，做种魔力清算就会突破60s限制（Nginx默认超时时间）。而种子表突破5k行之后，种子情况更新也会突破相关限制。~~（以上行数均为本人瞎写瞎编）~~

此外，这两个长耗时任务均处在清理程序首部，容易因为超时自动退出，而且NPHP默认是通过`register_shutdown_function("autoclean")`的形式进行执行，导致后续清理程序无法正常运行。

考虑通过以下方式进行优化：

1. 去除Nginx服务超时限制，本地使用crontab定时wget请求cron.php页面。具体方法可见NPHP中`include/config.php`说明。
2. 使用PHP_CLI运行`cron.php`文件，绕过Web服务器的相关超时设置。这也是本文的相关说明要点。

<!--more-->

## 相关修改说明

1. 将cleanup相关方法托给cron，而不是shutdown_function。此步只需要修改config.php文件即可，将全部变量`$useCronTriggerCleanUp`改为true值即可。

    ```patch
    Index: include/functions.php
    IDEA additional info:
    Subsystem: com.intellij.openapi.diff.impl.patch.CharsetEP
    <+>UTF-8
    ===================================================================
    --- include/functions.php	(revision e97ab8f41738d550ec9dff6b1d16fc814fdb8eb5)
    +++ include/functions.php	(date 1579598707415)
    @@ -1708,10 +1708,6 @@
     	mysql_select_db($mysql_db) or die('dbconn: mysql_select_db: ' + mysql_error());
     
     	userlogin();
    -
    -	if (!$useCronTriggerCleanUp && $autoclean) {
    -		register_shutdown_function("autoclean");
    -	}
     }
     function get_user_row($id)
     {
    Index: include/config.php
    IDEA additional info:
    Subsystem: com.intellij.openapi.diff.impl.patch.CharsetEP
    <+>UTF-8
    ===================================================================
    --- include/config.php	(revision e97ab8f41738d550ec9dff6b1d16fc814fdb8eb5)
    +++ include/config.php	(date 1579597884946)
    @@ -396,7 +396,7 @@
     //Make sure you have wget installed on your OS
     //replace "http://www.nexusphp.com/" with your own site address
    
    -$useCronTriggerCleanUp = false;
    +$useCronTriggerCleanUp = true;
     //some promotion rules
     //$promotionrules_torrent = array(0 => array("mediumid" => array(1), "promotion" => 5), 1 => array("mediumid" => array(3), "promotion" => 5), 2 => array("catid" => array(402), "standardid" => array(3), "promotion" => 4), 3 => array("catid" => array(403), "standardid" => array(3), "promotion" => 4));
     $promotionrules_torrent = array();
    ```

 2. 限制`cron.php`的运行环境，在`cron.php`文件头部增加以下代码进行限制

    ```php
    if (PHP_SAPI != 'cli') {
        header("HTTP/1.0 403 Forbidden");
        die('RUN in CLI');
    }
    ```

3. 将`autoclean()`方法从`function.php`中移出，并增加启动命令`--print`, `--force-all`

   ```patch
   Index: include/functions.php
   IDEA additional info:
   Subsystem: com.intellij.openapi.diff.impl.patch.CharsetEP
   <+>UTF-8
   ===================================================================
   --- include/functions.php	(revision e97ab8f41738d550ec9dff6b1d16fc814fdb8eb5)
   +++ include/functions.php	(date 1579598186100)
   @@ -1818,27 +1818,7 @@
    	}
    }
    
   -function autoclean() {
   -	global $autoclean_interval_one, $rootpath;
   -	$now = TIMENOW;
    
   -	$res = sql_query("SELECT value_u FROM avps WHERE arg = 'lastcleantime'");
   -	$row = mysql_fetch_array($res);
   -	if (!$row) {
   -		sql_query("INSERT INTO avps (arg, value_u) VALUES ('lastcleantime',$now)") or sqlerr(__FILE__, __LINE__);
   -		return false;
   -	}
   -	$ts = $row[0];
   -	if ($ts + $autoclean_interval_one > $now) {
   -		return false;
   -	}
   -	sql_query("UPDATE avps SET value_u=$now WHERE arg='lastcleantime' AND value_u = $ts") or sqlerr(__FILE__, __LINE__);
   -	if (!mysql_affected_rows()) {
   -		return false;
   -	}
   -	require_once($rootpath . 'include/cleanup.php');
   -	return docleanup();
   -}
    
    function unesc($x) {
    	return $x;
   Index: cron.php
   IDEA additional info:
   Subsystem: com.intellij.openapi.diff.impl.patch.CharsetEP
   <+>UTF-8
   ===================================================================
   --- cron.php	(revision e97ab8f41738d550ec9dff6b1d16fc814fdb8eb5)
   +++ cron.php	(date 1579598452935)
   @@ -1,6 +1,33 @@
    <?php
    require_once("include/bittorrent.php");
    dbconn();
   +
   +function autoclean() {
   +    global $argv;
   +    global $autoclean_interval_one, $rootpath;
   +    $now = TIMENOW;
   +
   +    $force_all = PHP_SAPI == 'cli' ? in_array('--force_all', $argv) : false;
   +    $print = PHP_SAPI == 'cli' ? in_array('--print', $argv) : false;
   +
   +    $res = sql_query("SELECT value_u FROM avps WHERE arg = 'lastcleantime'");
   +    $row = mysql_fetch_array($res);
   +    if (!$row) {
   +        sql_query("INSERT INTO avps (arg, value_u) VALUES ('lastcleantime',$now)") or sqlerr(__FILE__, __LINE__);
   +        return false;
   +    }
   +    $ts = $row[0];
   +    if ($ts + $autoclean_interval_one > $now) {
   +        return false;
   +    }
   +    sql_query("UPDATE avps SET value_u=$now WHERE arg='lastcleantime' AND value_u = $ts") or sqlerr(__FILE__, __LINE__);
   +    if (!mysql_affected_rows()) {
   +        return false;
   +    }
   +    require_once($rootpath . 'include/cleanup.php');
   +    return docleanup($force_all, $print);
   +}
   +
    if ($useCronTriggerCleanUp) {
    	$return = autoclean();
    	if ($return) {
   ```

   在做完前三步之后，我们就可以使用`php /path/to/cron.php --print`相关命令直接运行NPHP的清理程序。

4. 因为dbconn方法中自带了userlogin方法，所以我们在CLI环境中要禁止其使用userlogin的运行，简单处理如下

    ```php
    if (PHP_SAPI != 'cli') userlogin();
    ```

5. 设置crontab，具体如下

   ```crontab
   */5 * * * *  php /path/to/cron.php
   ```

   