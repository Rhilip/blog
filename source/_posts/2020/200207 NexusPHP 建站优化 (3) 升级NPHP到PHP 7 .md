---
title: NexusPHP 建站优化 (3) 升级NPHP到PHP 7 
date: 2020-02-07 05:47:00
categories: PHP
tags: [nexusphp,mysqli,php7,redis]
permalink: /archives/1188/
---

因为NexusPHP较早就停止维护，所以官方源码基本只能停留在PHP5.3-5.6版本使用，无法使用PHP7，然而随着PHP5.x（甚至PHP7.0）已经完全停止维护，势必有必要将NPHP推进到PHP7.x。然而主要阻碍这种推进的原因是因为：

1. Mysql库在PHP7中不存在，必须更换到 Mysqli库。
2. Memcache库在PHP7出现兼容性问题，需要调整连接代码，或更换到 Memcached库 或者 Redis库。
3. Github或其他开源代码库中没有PHP7版本的NexusPHP。

基于以上原因，本文给出相关方法实现：

- 使用psr-4相关方法，加载`/classes`目录中库文件。
- 替换Cache组件的后端为Redis。
- 使用单例模式的Mysqli wrapper组件替换原Mysql库相关方法，将Mysql连接改成只有第一次执行query或相关方法时才连接，避免NPHP遭受CC攻击时，大量连接请求直接拖垮Mysql导致服务不可用；并提供stmt方法支持，可以通过更换写法的形式组件将NPHP的real_query实现改成stmt实现，防止SQL注入。
- 移除PHP 7中不存在的相关方法，例如 `get_magic_quotes_gpc` 等。

以下讲解和代码patch均基于本人fork的官方源码 [Rhilip/NexusPHP](https://github.com/Rhilip/NexusPHP)（v1.5.beta5.20120707），**不提供除本文外的任何形式的说明以及免费讲解**。

具体请见：[Rhilip/NexusPHP#2](https://github.com/Rhilip/NexusPHP/pull/2)

![image-20200207133455442.png](/images/2020/02/1766104004.png)

>  请注意：
>
> 1. 可以使用该库 [MySQL wrapper for MySQLi](https://github.com/e-sites/php-mysql-mysqli-wrapper) ，快速提供mysqli库在mysql方法名下的支持，但因为其过于简单，且无法使用到stmt特性，故本文不做额外说明。
> 2. 部分小细节，比如 `$arr[id]` ，PHP 4 style constructors 等未在此步骤中体现。你应该参照PHP官方升级教程 [Migrating from PHP 5.6.x to PHP 7.0.x](https://www.php.net/manual/en/migration70.php#migration70) 或使用 PHPStan 等静态工具进行进一步的检查。

<!--more-->

## 详细步骤说明

1. 在`composer.json`中注册namespace，之后使用`composer dumpautoload` 刷新依赖，假定此处的命名空间为`NexusPHP`。（[@744d83d](https://github.com/Rhilip/NexusPHP/pull/2/commits/744d83df858a92fc5a408674cd3b9c928c4c43f0)）

   ```json
   "autoload": {
     "psr-4": {
       "NexusPHP\\": "classes/"
     }
   }
   ```

2. 修改原`classes/`目录下的组件，并优化使用这些组件的相关PHP脚本。([@684ed5a](https://github.com/Rhilip/NexusPHP/pull/2/commits/684ed5ad5fa851925ebc182c5cc2244f5d9981cf))（注意，我们这里会全局使用类似`\NexusPHP\Components\Cache` 的形式调用这些组件，而不是用use声明。因为这样可以最快速的进行全局替换）

3. 将Cache组件的后端改为Redis，并使用魔法方法`__call()`封装的形式提供Redis原生方法支持。([@1605687](https://github.com/Rhilip/NexusPHP/pull/2/commits/1605687b46565578ae5a2cb5251f5a7fe35e52ab))

4. 构造Database组件，并提供原有mysql相关方法。([@4da4f84](https://github.com/Rhilip/NexusPHP/pull/2/commits/4da4f840e4620bb09d82a366e307e758212477ea))

5. 使用全局替换的形式对原mysql_方法进行替换([@35dc3ea](https://github.com/Rhilip/NexusPHP/pull/2/commits/35dc3eafeec44bb2909e7539de0a0a81253f6856))，替换规则如下（注意替换顺序从下到上不要错误）：

   ```
   # 以下启用Match模式
   mysql_query(      ->  \NexusPHP\Components\Database::query(
   mysql_real_escape_string(  ->  \NexusPHP\Components\Database::real_escape_string(
   mysql_error()     ->  \NexusPHP\Components\Database::error()
   mysql_affected_rows()  -> \NexusPHP\Components\Database::affected_rows()
   mysql_errno()     ->  \NexusPHP\Components\Database::errno()
   mysql_insert_id() ->  \NexusPHP\Components\Database::insert_id()
   mysql_fetch_array(  ->  mysqli_fetch_array(
   mysql_fetch_assoc(  ->  mysqli_fetch_assoc(
   mysql_fetch_row(    ->  mysqli_fetch_row(
   mysql_num_rows(     ->  mysqli_num_rows(
   mysql_connect(      ->  mysqli_connect(
   mysql_free_result(  ->  mysqli_free_result( 
   
   sqlesc(           ->  \NexusPHP\Components\Database::escape(
   sql_query(        ->  \NexusPHP\Components\Database::query(
   get_row_count(    ->  \NexusPHP\Components\Database::count(
   get_row_sum(      ->  \NexusPHP\Components\Database::sum(
   get_single_value( ->  \NexusPHP\Components\Database::single(
   
   # 以下启用Match，Regex模式
   array_map\(['"]sqlesc['"], ?(array\(.+?\)|\$.+?)?\)  -> \\NexusPHP\\Components\\Database::escape($1)
   ```

   ![image-20200207120139459.png](/images/2020/02/3588267576.png)

   并修改dbconn()，仅保留其中userlogin相关部分，移除散落的 `dbconn_announce(), sql_query(), sqlesc(), get_row_count(),get_row_sum(), get_single_value() ` 方法定义。注意，除dbconn_announce() 方法之外，其他函数及变量的定义可能在之前的全局替换中被修改了，请定位到其原先位置然后删除。

   然后同样使用全局搜索，检查是否还有遗漏mysql_方法未清理完成，剩下的应该只有lang以及settings里面的一些变量定义，这些可以不管。

   ![image-20200207125837729.png](/images/2020/02/3959935735.png)

6. 移除在`inculde/core.php`中定义的全局数组 `$query_name`，并使用`\NexusPHP\Components\Database::getQueryHistory()` 方法进行替换。到这里，我们的NPHP基本已经可以在PHP7+Redis环境中运行了。([@118fcad](https://github.com/Rhilip/NexusPHP/pull/2/commits/118fcad327b629862e3c03cb447715c933ccce59))

7. 打开`include/core.php`中的debug方法，并移除一些PHP7中已经不兼容的一些方法，比如get_magic_quotes_gpc()。除此以外，NPHP还有类似 `$arr[id]`的一些不规范写法，在打开debug之后你可以看到notice的提示，你需要进行相关修正。([@17ba5c4](https://github.com/Rhilip/NexusPHP/pull/2/commits/17ba5c443f3020f84167eeb9719cecb0c3ece51e))

   ```php
   error_reporting(E_ALL);
   ini_set('display_errors', 1);
   ```

8. 使用stmt方法进行优化，防止SQL注入（此处仅作示例） ([@f9ddf9a](https://github.com/Rhilip/NexusPHP/pull/2/commits/f9ddf9afb7c644614d36d01419c9215fca0675bd))

   ```php
   function write_log($text, $security = "normal")
   {
       \NexusPHP\Components\Database::query("INSERT INTO sitelog (added, txt, security_level) VALUES(NOW(), ?, ?)", [$text, $security]) or sqlerr(__FILE__, __LINE__);
   }
   ```

