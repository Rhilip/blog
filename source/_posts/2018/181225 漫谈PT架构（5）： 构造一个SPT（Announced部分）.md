---
title: 漫谈PT架构（5）： 构造一个SPT（Announced部分）
date: 2018-12-25 14:25:05
categories: PHP
tags: [tracker,announce]
permalink: /archives/1043/
---

相比于相对简单的Scrape，Announce构造相对麻烦。（嗯，从上篇文章的发出之后，我又尝试了ThinkPHP5、Symfony等架构的测试。经过多次尝试后，决定在某个Swoole的PHP框架上再次开发。之后的文章示意代码依次为准。

> 发出鸽鸽鸽鸽鸽鸽鸽鸽鸽鸽鸽鸽鸽鸽鸽鸽的声音~

## 总代码示例

这里贴出的是一个示例的步骤（伪代码），可以看到Tracker的Announce步骤依次如下，对字段的检验和选择，获得种子信息并缓存加快响应、处理请求、生成返回信息。我将依次对这几个部分进行说明。

```php
$this->checkAnnounceFields(&$queries);   // 检查请求字段
$this->getTorrentInfo($queries, $userInfo, &$torrentInfo);   // 根据info_hash获得种子信息
$role = ($queries['left'] == 0) ? 'yes' : 'no';  // 获得peer身份信息
$this->processAnnounceRequest($queries, $role, $userInfo, $torrentInfo);  // 处理请求
$this->generateAnnounceResponse($queries, $role, $torrentInfo, &$rep_dict);  // 生成返回信息
return Bencode::encode($rep_dict);  // 返回请求
```

<!--more-->

## 请求字段的检验

虽然贴过很多次与Tracker通信的过程中的HTTP报文，但是为了说明我这里还是再贴一次，并建议打开 [BEP 0003 The BitTorrent Protocol Specification](http://www.bittorrent.org/beps/bep_0003.html) 阅读对应文档说明。

```http
GET http://nexusphp.localhost/announce.php?passkey=db534098baaaa68bd725aaaae3051518&info_hash=aaaaaaaaaaaaaaaaaaaa&peer_id=-TR2940-lhqkh1jtwjqp&port=21736&uploaded=0&downloaded=0&left=739573325&corrupt=0&key=DDDD2A2B&event=started&numwant=200&compact=1&no_peer_id=1 HTTP/1.1
Host: nexusphp.localhost
User-Agent: Transmission/2.94
Accept-Encoding: gzip
Connection: Close
```

1. 必须字段获取

我们选择`'info_hash', 'peer_id', 'port', 'uploaded', 'downloaded', 'left', 'passkey'`作为我们的必须字段，当这些字段缺失的时候，应该直接返回错误。其中`passkey`虽然不是BEP规定的字段，但是是作为Private Tracker必须要的身份证明。示例代码如下：

```php
// Notice: param `passkey` is not require in BEP , but is required in our private torrent tracker system
foreach (['info_hash', 'peer_id', 'port', 'uploaded', 'downloaded', 'left', "passkey"] as $item) {
    $item_data = Request::get($item);
    if (!is_null($item_data)) {
         queries[$item] = $item_data;
    } else {
         throw new TrackerException(130, [":attribute" => $item]);
    }
}
```

并对这些字段值进行校验，检验规则如下：

- `info_hash`、`peer_id`的长度应为20字节 (PHP中直接使用`strlen`校验)
- `uploaded`、`downloaded`、`left`应该是正整数

2. 可选（非必须）字段获取

可选字段应该是有默认值存在的，当BT软件在请求中提供的话，就覆盖默认值的字段。示例代码如下：

```php
foreach ([
    'event' => '', 'no_peer_id' => 1, 'compact' => 0, 'numwant' => 50,
    'corrupt' => 0, 'key' => '', 
    'ip' => '', 'ipv4' => '', 'ipv6' => ''
] as $item => $value) {
    $queries[$item] = Request::get($item) ??$value;
}
```

各字段的校验规则如下：

- `event`的值只允许在以下值（`'started', 'completed', 'stopped', 'paused'`）中选取或者为空。
- `no_peer_id`，`compact`分别影响返回的响应，其中启用no_peer_id（即`&no_peer_id=1`）的时候，返回的peer列表中只提供ip和port信息，不提供peer_id信息。而当`&compact=1`时，tracker应该返回紧凑型响应（见[BEP0023 Tracker Returns Compact Peer Lists](http://www.bittorrent.org/beps/bep_0023.html)定义），注意此时同样不返回peer_id信息。
- `numwant`表示BT软件希望得到的peer数，常见的请求值有`50,100,200`。
- `corrupt`和`key`用来标识客户端
- `ip`，`ipv4`，`ipv6`是用来存储用户ip地址信息的字段。关于用户ip地址的择取我会在后面详细说明。

3. 用户ip地址获取

首先我们要知道可以从那些地方获取ip信息。应该是有4块，分别是请求头中记录的`remote_ip`，以及请求字段中的`&ip=`，`&ipv4=`，`&ipv6=`。那么我们应该采取那个ip地址作为用户ip，是一个很重要的问题。

NexusPHP是直接使用`remote_ip`并忽略请求字段中的值，这显然是不合理的。因为这样对双栈的用户只记录了他们的其中一个ip（而且极有可能是ipv6地址）。

在[BEP0007 IPv6 Tracker Extension](http://www.bittorrent.org/beps/bep_0007.html)中规定了请求字段的`&ipv6=`以及`&ipv4=`格式。并给出以下三个示例

> Example announce string with 2001::53aa:64c:0:7f83:bc43:dec9 as IPv6 address:

```http
GET /announce?peer_id=aaaaaaaaaaaaaaaaaaaa&info_hash=aaaaaaaaaaaaaaaaaaaa
&port=6881&left=0&downloaded=100&uploaded=0&compact=1
&ipv6=2001%3A%3A53Aa%3A64c%3A0%3A7f83%3Abc43%3Adec9
```

> Example announce string with [2001::53aa:64c:0:7f83:bc43:dec9]:6882 as IPv6 endpoint:

```http
GET /announce?peer_id=aaaaaaaaaaaaaaaaaaaa&info_hash=aaaaaaaaaaaaaaaaaaaa
&port=6881&left=0&downloaded=100&uploaded=0&compact=1
&ipv6=%5B2001%3A%3A53Aa%3A64c%3A0%3A7f83%3Abc43%3Adec9%5D%3A6882
```

> Example announce string with 2001::53aa:64c:0:7f83:bc43:dec9 as IPv6 address and 261.52.89.12 as IPv4 address:

```http
GET /announce?peer_id=aaaaaaaaaaaaaaaaaaaa&info_hash=aaaaaaaaaaaaaaaaaaaa
&port=6881&left=0&downloaded=100&uploaded=0&compact=1
&ipv6=2001%3A%3A53Aa%3A64c%3A0%3A7f83%3Abc43%3Adec9&ipv4=261.52.89.12
```

鉴于在实际的请求中`&ip=`字段以及请求头中的`remote_ip`均有可能为ipv4或者ipv6类型。我们对其采取的是回落策略。即`&ipv6= -> &ip=<ipv6> -> remote_ip (ipv6)`。额外需要注意的是`&ipv6=`字段中存储的值有两种形式，一种是`IPv6 address`，另一种是`IPv6 endpoint`。对`endpoint`形式的应该从中提取出ip地址和port端口信息。

4. port校验

在最后，我们对port值进行校验。检验原则如下：当event为`stopped`时，port可以为0，其他情况port值应为0-0xffff（及65535）中整数且不在端口黑名单中。下面是一个可行的黑名单列表：

```php
$portBlacklist = [
    22,  // SSH Port
    53,  // DNS queries
    80, 81, 8080, 8081,  // Hyper Text Transfer Protocol (HTTP) - port used for web traffic
    411, 412, 413,  // 	Direct Connect Hub (unofficial)
    443,  // HTTPS / SSL - encrypted web traffic, also used for VPN tunnels over HTTPS.
    1214,  // Kazaa - peer-to-peer file sharing, some known vulnerabilities, and at least one worm (Benjamin) targeting it.
    3389,  // IANA registered for Microsoft WBT Server, used for Windows Remote Desktop and Remote Assistance connections
    4662,  // eDonkey 2000 P2P file sharing service. http://www.edonkey2000.com/
    6346, 6347,  // Gnutella (FrostWire, Limewire, Shareaza, etc.), BearShare file sharing app
    6699,  // Port used by p2p software, such as WinMX, Napster.
    6881, 6882, 6883, 6884, 6885, 6886, 6887, // BitTorrent part of full range of ports used most often (unofficial)
    //65000, 65001, 65002, 65003, 65004, 65005, 65006, 65007, 65008, 65009, 65010   // For unknown Reason 2333~
];
```

## 获取种子信息

这个没什么好说的，根据前面获得的`info_hash`信息从缓存从获取种子信息，当缓存穿透的时候读数据库中信息。示例代码如下：

```php
$info_hash = $queries["info_hash"];

$torrentInfo = Redis::get('torrent_hash_' . $info_hash . '_content');
if ($torrentInfo === false) {
     $torrentInfo = PDO::createCommand("SELECT id , info_hash , owner_id , status , incomplete , complete , added_at FROM torrents WHERE info_hash = :info LIMIT 1")->bindParams(["info" => $info_hash])->queryOne() ?: null;
     Redis::setex('torrent_hash_' . $info_hash . '_content', 350, $torrentInfo);
}
if (is_null($torrentInfo)) throw new TrackerException(150);
```

## 处理请求

处理请求可能是在Private Tracker中最为重要的一块了。在NP中分为三个表`users`、`snatched`、`peers`表的信息更新。

首先应该确定该会话时候在`peers`表里面存在，如果没有，我们应该在`peers`表中新填一条记录，并更新`snatched`表和`users`表。如果该会话存在的话，因为announce字段的值都是返回总计值的，所以我们应在用户之前记录的基础上，计算累加值作为用户两次announce之间的上传量和下载量，并更新3个表。

在此过程中，我们还可以根据一些信息判断用户是否能够下载或者上传，或者做速度检查。

## 响应请求

当`compact=0&no_peer_id=0`时，其返回的json格式如下：

```json
{
    "interval": 50,
    "min interval": 20,
    "complete": 6871,
    "incomplete": 3,
    "peer": [
        {
            "ip": "xxx.xxxx.xxx.xxx",
            "peer_id": "-TR2940-lhqkh1j31jqp",
            "port": 5698,
        },
        ....
    ]
}
```

而如果`&no_peer_id=1`时，`peer`列表中的`peer_id`项可以不要。而如果`&compact=1`时，返回的peer项应该为一个string，且仅存储ipv4用户（每6个字节一个用户），当有ipv6用户时，对应用户信息（每18个字节一个用户）以string存储在`peer6`中。

因为这里仅涉及了查表操作，故不作详细说明。

仅交代PHP下compact为 `inet_pton($peer["ip"]) . pack("n", $peer["port"])`。
其中IPv4信息还可以使用`pack("Nn", sprintf("%d",ip2long($peer["ip"])), $peer['port'])` （NexusPHP使用）