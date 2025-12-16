---
title: PHP解析 ipv6wry.db 数据库
date: 2019-09-19 10:41:00
categories: PHP
tags: []
permalink: /archives/1122/
---

我可能算是比较关注 `ipv6wry.db` 这个IPv6数据库的人之一了吧，之前就有写了自动更新脚本 [Rhilip/ipv6wry.db](https://github.com/Rhilip/ipv6wry.db) ，再早之前在PT-help中也使用了该库。

昨天晚上不知道在想些什么，搜索了一圈没见到 PHP 版本解析库，突然就有写一个的想法。

> Github Source: <https://github.com/Rhilip/ipv6wry-php>
> Packgist: <https://packagist.org/packages/rhilip/ipv6wry>

## 前人们的工作

- 官方给出的解析工具中只有 C、Python 版本的实现

- 真红酱在[他的CSDN中](https://blog.csdn.net/chenzhuyu/article/details/50661967)使用的方法是使用Python导出CSV文件，然后入库，然后直接根据IPv6前四个字段的值检索数据库。这样的问题是数据库里面需要存储近11w条数据，且不好得到更新（或者说更新过于麻烦）。

  ![1568881326812.png](/images/2019/09/1163949642.png)

- [JohnWong/python-tool](https://github.com/JohnWong/python-tool) 公开了另外一种Python的实现，只不过其实现基于Python2。不过好在2017年，本人就在工具 [PT-help](https://github.com/Rhilip/PT-help/blob/master/modules/geo/utils.py) 中将其实现改成了Python3。

## IPDB格式说明

以下说明来自官方文档

```
文件头
0~3	字符串	"IPDB"
4~5	short	版本号,现在是2
6	byte	偏移地址长度(2~8)
7	byte	IP地址长度(4或8或12或16, 现在只支持4(ipv4)和8(ipv6))
8~15	int64	记录数
16~23	int64	索引区第一条记录的偏移
24	byte	地址字段数(1~255)[版本2新增,版本1是2]
25~31	reserve	保留,用00填充

记录区
array 字符串[地址字段数]
	与qqwry.dat大致相同,但是没有结束IP地址
	01开头的废弃不用
	02+偏移地址[偏移长度]表示重定向
	20~FF开头的为正常的字符串,采用UTF-8编码,00结尾

索引区
struct{
	IP[IP地址长度]	little endian, 开始IP地址
	偏移[偏移长度]	little endian, 记录偏移地址
}索引[记录数];
```

所以直接使用该 `ipv6wry.db` 的核心思想在于从索引区找到记录区的偏移地址，然后根据读取字符串（UTF-8编码）以及是否有重定向偏移继续读取。

## 版本实现

[Rhilip/ipv6wry-php](https://github.com/Rhilip/ipv6wry-php) 使用单例模式，当前（v0.1.0）向外开放两个静态方法

```php
/**
 * 设定 ipv6wry.db 数据库位置（使之能使用外部的ipv6wry.db库进行解析）
 */
\Rhilip\Ipv6Wry\IpLocation::setDbPath(string $db_path = null): void;

/**
 * 解析IPv6地址，
 * 如果解析成功返回 ['ip' => $ip, 'area' => $area]
 * 如果解析失败返回 ['error' => $error]
 */
\Rhilip\Ipv6Wry\IpLocation::searchIp(string $ipv6): array;
```

编写过程主要参照的是之前在PT-help中的实现（不过没有实现其IPv4查询的部分），并参照其他PHP的GeoIP库的实现。下面就随便讲一下中间遇到的主要问题以及解决方法。

<!--more-->

1. IPv6前4字段转换为长整数 `parseIpv6()`

   因为我们在索引区查找记录区的偏移地址需要知道开始IP地址，其值是IPv6前4字段的长整数表示。其方法在Python有

   ```python
   def parseIpv6(ip):
       if v6ptn.match(ip) is None:
           return -1
       count = ip.count(':')
       if count >= 8 or count < 2:
           return -1
       ip = ip.replace('::', '::::::::'[0:8 - count + 1], 1)
       if ip.count(':') < 6:
           return -1
       v6 = 0
       for sub in ip.split(':')[0:4]:
           if len(sub) > 4:
               return -1
           if len(sub) == 0:
               v6 = v6 * 0x10000
           else:
               v6 = v6 * 0x10000 + int(sub, 16)
       return v6
   ```

   或者更为简单的（需要Python版本大于3.3）

   ```python
   import ipaddr
   ip6 = int(ipaddr.IPAddress(ip))
   ip = (ip6 >> 64) & 0xFFFFFFFFFFFFFFFF
   ```

   PHP并没有直接的实现，`inet_pton`返回的是binary格式，如果需要转成int形式，还需要使用unpack形式（见 https://stackoverflow.com/questions/18276757/php-convert-ipv6-to-number ），过于繁琐。考虑参照Python的实现

   ```php
   function parseIpv6(string $ip): int
       {
           // 检查是不是ipv6
           $ipv6 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6);
           if ($ipv6 === false) return -1;
           // 补全 ::
           $count = substr_count($ipv6, ':');
           $ipv6 = preg_replace('/::/', str_repeat(':', 8 - $count + 1), $ipv6, 1);
           // 我们只要前4个，并将其将其转换为整数
           $v6_prefix_long = 0;
           $subs = array_slice(explode(':', $ipv6), 0, 4);
           foreach ($subs as $sub) {
               if (strlen($sub) > 4) return -1;
               $v6_prefix_long = bcadd(bcmul($v6_prefix_long, 0x10000), intval($sub, 16));
           }
           return (int)$v6_prefix_long;
       }
   ```

   此处是唯一使用 bcmath的地方，原因在于如果给定的ipv6地址过大（例如 `fe80::1`），直接使用 `$v6 = $v6 * 0x10000 + intval($sub, 16)` 会导致最后的值为 float类型，而使用bcadd之后再转换为int不会有该问题。

2. 偏移读取并转换Binary形式 `read(),readInt(),readRawText()`

   考虑到PHP直接操作字符串存在过多问题，且PHP字符串相关截取方法并不如Python直接可以使用`[start:end:step]`的形式，所以使用fseek+fread的形式进行偏移读取。

   ```php
   function read(int $offset = 0, int $size = 1): string
       {
           fseek($this->handle, $offset, SEEK_SET);
           return fread($this->handle, $size);
       }
   ```

   读取出来的类型有byte，int64，UTF-8编码的字符串，需要分别解析出来。在Python里面的实现分别为

   ```python
   byte_ = db[6] # byte
   int64_ = int.from_bytes(self.db[0x10: 0x18], byteorder='little') # int64
   
   def readRawText(self, start):
       bs = []
       if self.type == 4 and start == self.except_raw:
           return bs
       while self.db[start] != 0:
           bs += [self.db[start]]
           start += 1
       return bytes(bs)
   
   # UTF-8编码的字符串，00结尾
   utf8_ = readRawText(start).decode('utf-8')
   ```

   转换为对应的PHP实现，直接使用unpack方法（little endian），

   ```php
   private function readInt(int $offset = 0, int $size = 8): int
    {
        $s = $this->read($offset, $size);
        if ($size == 3) {
            $s .= "\x00";
            $size = 4;
        }

        $format = [8 => 'P', 4 => 'V', 1 => 'C'][$size];
        return unpack($format, $s)[1];
    }
   ```

   其中当`$size = 1`时，可以使用`hexdec(bin2hex($s))`的方法，但是考虑会增加方法，不如均使用`unpack($format,$s)[1]`来处理Binary形式的数字。
   注意，当`$size = 3`时，应该将其补全到4 bytes然后按照4 bytes的形式处理。（v0.1.2 fix） 
   更多的`PHP binary to int`方法可见 [pmmp/BinaryUtils](https://github.com/pmmp/BinaryUtils) 库中的方法，本处仅择取了部分所需的字段方法。

   而读取UTF-8编码的字符串则使用下述方法，考虑到编码，循环次数应该为3的倍数，但实际仍每次读入一个字节并使用`chr()`返回指定的字符。

   ```php
   private function readRawText(int $start): string
       {
           $bs = '';
   
           # 使用循环读取，0为终止
           while (0 != $p = $this->readInt($start, 1)) {
               $bs .= chr($p);
               $start += 1;
           }
   
           return $bs;
       }
   ```

3. 解决了上面两个问题，其他的则较为简单，直接从Python的实现照抄就行，无别的需要折腾的地方。

