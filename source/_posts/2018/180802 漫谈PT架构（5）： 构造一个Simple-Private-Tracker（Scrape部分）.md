---
title: 漫谈PT架构（5）： 构造一个Simple-Private-Tracker（Scrape部分）
date: 2018-08-02 11:44:00
categories: knowledge
tags: [PT,scrape]
permalink: /archives/988/
---

在这节及之后的PT架构书写过程中，我将使用`ThinkPHP 5`作为MVC框架，[rchouinard/bencode](https://github.com/rchouinard/bencode) 作为Bencode编码库，实现一个演示性质的Private Tracker。在此，我将默认你已经对前面的内容有所理解，并对PHP以及composer有了解运用。

该项目代码见： https://github.com/Rhilip/Simple-Private-Tracker ，仅供学习无法运行~

> 请注意，本文所列方法，仅表示本人的一种实现。实际只要符合BEP 0003以及BEP 0027的都是可行的实现~
> 请注意，本处所列代码并不一定是最新的，仅代表思考逻辑过程，具体代码请看repo

相关commit：[c2c37e668a3f63722b6d4d736e957c8cda76b2a8](https://github.com/Rhilip/Simple-Private-Tracker/commit/c2c37e668a3f63722b6d4d736e957c8cda76b2a8)

## 基础准备

首先，我们需要准备好PHP环境（建议为7.x）以及数据库，因为学习，所以缓存暂时使用文件缓存。并使用composer安装 ThinkPHP5以及bencode ，其命令分别如下：

```bash
composer create-project topthink/think=5.0.* tp5  --prefer-dist
cd pt
composer require rych/bencode
```

准备相关数据表，分别用来存储 Torrent（种子信息）、User（用户信息）、Peer（做种人信息）、Snatch（做种完成情况），此处为了方便~~（偷懒）~~直接使用NP的建表语句（-> 见 [NexusPHP/_db/dbstructure.sql](https://github.com/ZJUT/NexusPHP/blob/master/_db/dbstructure.sql) 相关）就行~~（实际很多字段不需要）~~。顺带也方面后续兼容~

而文件夹方面，依次添加以下文件：

```
├─application
│  ├─tracker
│  │  ├─controllers
│  │  │ └─Index.php
```

并在路由（`route\route.php`）中注册两个控制器

```php
Route::get('tracker/scrape','tracker/Index/scrape');
Route::get('tracker/announce','tracker/Index/announce');
```

并在设置中开启你的debug模式以及应用trace，准备postman或其他作为调试工具。

## 方法准备

我们先要为`TrackerController` 准备一些公用方法，分别用于构造响应信息（包括正常的以及错误）、禁用浏览器访问。修改`app\Http\Controllers\TrackerController.php`为以下信息：

```php
<?php

namespace app\tracker\controller;

use think\Controller;
use think\Db;
use think\facade\Cache;
use think\Request;
use think\Response;
use think\Validate;

use Rych\Bencode\Bencode;

class Index extends Controller
{

    private $errormsg = [
        // Error message about requests params
        // Error message about Bittorrent Client
        // Error message about User Account
        // Error message about Torrent
        // Error message about Server
    ];
    
    private $announce_param = [];  // Announce Param HERE~

    public function announce(Request $request)
    {
    }

    public function scrape(Request $request)
    {
    }

    private function block_browser()
    {
        $judge = false;
        $request = Request();
        if (preg_match("/Mozilla|Opera|Links|Lynx/", $request->header("user_agent"))) {
            $judge = true;
        }
        if (!$request->isSSl()) {
            if (
                (null !== $request->header("Cookie", null)) ||
                (null !== $request->header("Accept-Language", null)) ||
                (null !== $request->header("Accept-Charset", null))
            ) {
                $judge = true;
            }
        }
        return $judge;
    }

    private function sendErrorMsg($code = 999, $msg = null)
    {
        if ($code && !$msg) {
            $msg = $this->makeErrorMsg($code);
        }

        return $this->bencResp([
            "failure reason" => $msg,
        ]);
    }

    private function makeErrorMsg($code)
    {
        return "$code - " . $this->errormsg[$code];
    }

    private function bencResp($obj)
    {
        $rep_benc = Bencode::encode($obj);
        return response($rep_benc)
            ->header("Content-Type", "text/plain; charset=utf-8")
            ->header("Pragma", "no-cache");
    }
}
```

我们将在`$errormsg`中定义错误信息，并在`announce`以及`scrape`这两个公开方法中定义具体逻辑。**而所有的响应应该使用`bencResp`构造。**

## 构建Scrape

相比较为复杂的Announce逻辑，我们先来处理较为简单的Scrape逻辑：

1. 从请求头中获取所有`info_hash`信息，
2. 从数据库中匹配出来对应的做种内容，
3. 构造返回或错误信息。

下面我们开始写Scrape的具体逻辑。首先我们先禁用掉 `非GET请求` 以及 `浏览器及非BT客户端请求`。代码如下，但实际上，因为已经设置的路由关系，我们其实已经禁止了非GET请求~，这里需要不需要都无所谓了~

```php
// 1. Block NON-GET requests, (though it should be block in Router)
if (!$request->isGet()) return $this->sendErrorMsg(100);
// 2. Block Browser, Crawler or Cheater
if ($this->block_browser()) return $this->sendErrorMsg(101);
```

然后我们从请求头中获取info_hash信息，并检查其是否存在（这里附加对各个info_hash的字节数进行检查也行）。当其不存在时，返回错误信息。

**注意**，根据[BEP0048](http://www.bittorrent.org/beps/bep_0048.html)规定 ，info_hash在url中是以`info_hash=xxxxx&info_hash=yyyyy`的形式存在的，故本人之前的写法是错误的（之前写法见[Archive.org的备份](https://web.archive.org/web/20181209113334/https://blog.rhilip.info/archives/988/)，只能匹配`info_hash[]=xxxx`的情况）

应为：

```php
preg_match_all('/info_hash=([^&]*)/i', urldecode(Request::server('query_string')), $info_hash_match);
$info_hash = $info_hash_match[1];
```

针对info_hash未找到的情况进行处理。

```php
if (count($info_hash) < 1) {
    return $this->sendErrorMsg(null,
        str_replace(':attribute', 'info_hash', $this->makeErrorMsg(102)));
}
```

使用查询构造器生成SQL语句并查询，并对查询结果进行检查；当数据库中未检查到该种子时，返回错误信息。

```php
$res = Db::table("torrents")
    ->field(['info_hash', 'times_completed', 'seeders', 'leechers'])
    ->where('info_hash', "IN", $info_hash)
    ->select();
if (count($res) < 1) {
    return $this->sendErrorMsg(131);
}
```

如果没有任何问题，我们需要把原来数据库中查询的结果（如下）进行转换

```
array(1) {
  [0] => array(4) {
    ["info_hash"] => string(20) "aaaaaaaaaaaaaaaaaaaaa"
    ["times_completed"] => int(0)
    ["seeders"] => int(0)
    ["leechers"] => int(0)
  }
}
```

方法如下，并最后使用`bencResp($obj)`的方式进行编码并发送

```php
$rep = [
    'files' => array_map(function ($item) {
        return array (
            $item["info_hash"] => [
                "complete" => $item["seeders"],
                "downloaded" => $item["times_completed"],
                "incomplete" => $item["leechers"],
            ]
        );
    },$res)
];
return $this->bencResp($rep);
```

![scrape_resp.jpg](/images/2018/08/1882544365.jpg)