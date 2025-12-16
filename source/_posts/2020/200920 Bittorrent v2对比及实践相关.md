---
title: Bittorrent v2对比及实践相关
date: 2020-09-20 11:09:27
categories: PHP
tags: [tracker,bittorrent,bep 0052]
permalink: /archives/1255/
---

前段时间（9月7日），libtorrent宣布其2.0版本开始支持 [BEP 52 The BitTorrent Protocol Specification v2](http://bittorrent.org/beps/bep_0052.html) 的相关协议（[BitTorrent v2 - libtorrent.org](https://blog.libtorrent.org/2020/09/bittorrent-v2/)）。

之前我在写RidPT的时候便翻过这个定稿于2017年的标准（历史悠久），但当时并没有客户端或Tracker对该标准有实现（**较长时间内可能也不会有Tracker或者下载器实现**），匆匆瞄了一眼便搁置了。如今重新捡起，看看对应标准和Tracker侧如何兼容。

> 全文总结： Bittorrent v2并不像是为了Private Tracker设计的。其中一些诸如节省metadata体积的方法、基于文件而不是字节块的哈希方法等，在magnet、DHT等协议中或许能体现其用途，但对于PT来说，可能作用的体现并不明显。

# 一、Spec更改项对比

>  此处仅列出我比较感兴趣的几个协议更改项对比，如有需要请翻阅 [The BitTorrent Protocol Specification](http://www.bittorrent.org/beps/bep_0003.html) 和 [The BitTorrent Protocol Specification v2](http://www.bittorrent.org/beps/bep_0052.html) 进行更进一步的了解。

## **1. hash算法从SHA-1变更为SHA-256**

v2协议中将哈希算法从原来SHA-1变更为SHA-256，这一改变不仅体现在了对于单一文件区块哈希中，同样还体现在了对于`$->info`的整体哈希中。这么变更的理由在于避免SHA-1的哈希碰撞（参见[Announcing the first SHA1 collision](https://security.googleblog.com/2017/02/announcing-first-sha1-collision.html)）。这与git不同，git同样使用SHA-1作为哈希算法，但是commit的SHA-1值分布在不同仓库中，能很大程度上避免SHA-1值被碰撞。而bittorrent的相关种子infohash值是全网空间的，特别在magnet协议中，是以` magnet:?xt=urn:btih:<sha1-info-hash>`的形式进行构造的，所以在全网空间中，是可能存在哈希碰撞的情况。

然而SHA-256的结果是32字节，这与目前SHA-1的20字节不相同。这就意味着如果要向下兼容的话，需要将已有的32字节SHA-256截断成20字节。目前在libtorrent中的实现便是通过扩展escape_string方法，并将最后的info_hash截断成20字节。

```c
// from https://github.com/arvidn/libtorrent/blob/ebe82ae569c23eb4fcd435e5c94e4763d4c8d4e1/src/http_tracker_connection.cpp#L110
        url += "info_hash=";
		url += escape_string({tracker_req().info_hash.data(), 20});
```

## 2.  **对文件列表结构进行重构（变成文件树形式）**

  这个是我个人比较喜欢的一点改变，因为从文件列表转化为文件树，能大大减少原`$->info->files[i]->path` 过长以及重复信息过多的问题（但这并不一定意味着种子文件大小能够减少）。

  在v1中，`$->info-> files` 的列表可能如下：

  ```json
  'files': [
      { 'length': 12323346, 'path': [ 'F' ] },
      { 'length': 2567, 'path': [ 'this is a very long directory name that ends up being duplicated a lot of times in v1 torrents', 'A' ] },
      { 'length': 14515845, 'path': [ 'this is a very long directory name that ends up being duplicated a lot of times in v1 torrents', 'B' ] },
      { 'length': 912052, 'path': [ 'this is a very long directory name that ends up being duplicated a lot of times in v1 torrents', 'C' ] },
      { 'length': 1330332, 'path': [ 'this is a very long directory name that ends up being duplicated a lot of times in v1 torrents', 'D' ] },
      { 'length': 2529209, 'path': [ 'this is a very long directory name that ends up being duplicated a lot of times in v1 torrents', 'E' ] }
    ],
  ```

这在文件数量特别多，或者文件目录嵌套过深时，特别容易造成最终打包出来的种子大小过大。（因为冗余信息过多）。而在v2标准中，将其改为使用文件树形式，并使用`$->info->file tree`存放。在`file tree`字典内，使用一个字典空键值表示最终文件，并为每个文件提供一个哈希检验值（额外的哈希检验值在某种程度上膨胀了种子体积）。

  ```json
  'file tree': {
      'F': { '': { 'length': 12323346, 'pieces root': 'd1dca3b4a65568b6d62ef2f62d21fcdb676099797c8aa3e092aa0adcb9a9f6a5' } },
      'this is a very long directory name that ends up being duplicated a lot of times in v1 torrents': {
        'A': { '': { 'length': 2567, 'pieces root': 'f6e5b48ebc00d7c6351aafdec9a0fa40ab9c8effe8ac6cfb565df070d9532f70' } },
        'B': { '': { 'length': 14515845, 'pieces root': '271d61e521401cfb332110aa472dae5f0d49209036eb394e5cf8a108f2d3fb03' } },
        'C': { '': { 'length': 912052, 'pieces root': 'd66919d15e1d90ead86302c9a1ee9ef73b446be261d65b8d8d78c589ae04cdc0' } },
        'D': { '': { 'length': 1330332, 'pieces root': '202e6b10310d5aae83261d8ee4459939715186cd9f43336f37ca5571ab4b9628' } },
        'E': { '': { 'length': 2529209, 'pieces root': '9cc7c9c9319a80c807eeefb885dff5f49fe7bf5fba6a6fc3ffee5d5898eb5fdb' } }
        }
    },
  ```

而pieces root的计算方法为merkle hash trees，这也使得v2的种子在文件层次上是对齐的。其原理示例图如下：

![merkle-hash-tree.png](/images/2020/09/761815740.png)

此外，对于原v1的`$->info->pieces`项，v2种子中也不再提供，而是将其放置在`$->piece layers`中，与最终的infohash值脱钩。

`piece layers`项在v2种子中是必须存在的。单文件大小小于区块大小的文件可以不列入该字典中，故其可以为空字典。而其键为之前在文件`pieces root`项出现的值，而其值为该文件每一个`piece length`大小的区块拼接形成，在实质上与之前的`$->info->pieces`项相同。

值得注意的是 `piece layers`项的值只考虑有效区块（不考虑对齐区块），其原文如下：

```
Layer hashes which exclusively cover data beyond the end of file, i.e. are only needed to balance the tree, are omitted.
```

## 3. **对Bencode方法规定的补充**

在v2中对原Bencode编解码相关规则进行了补充，主要是对于utf8的支持。原文如下：

  ```
  Note that in the context of bencoding strings including dictionary keys are arbitrary byte sequences (uint8_t[]).
  
  BEP authors are encouraged to use ASCII-compatible strings for dictionary keys and UTF-8 for human-readable data. Implementations must not rely on this.
  ```

# 二、种子制作测试

分别使用官网提供的工具[bep_0052_torrent_creator.py](http://bittorrent.org/beps/bep_0052_torrent_creator.py)以及Qbittorrent的使用同一区块大小（64kb）进行制种，观察种子结构，对比如下

## 多文件（文件夹）制种种子结构

  一个典型的v1、v2-only、v2-compatibility **多文件**种子结构分别如下（JSON格式）：

  ```json
  // v1 torrent
  {
      "announce": "example.com",
      "info"：{
      	"files": [
      		{"length": 23456, "path": ["folder", "filename"]},
              ......
      	],
  		"name": "test",
          "piece length": 65536,
          "pieces": "<hex string>",
  	}
  }
  
  // v2-only torrent
  {
      "announce": "example.com",
      "info"：{
      	"files tree": {
               "folder": {
                    "filename": {
                         "": {"length": 23456, "pieces root": "<hex string>"},
                    },
                    ...
               },
               ...
          },
          "meta version": 2,
  		  "name": "test",
          "piece length": 65536
  	},
      "piece layers": {
          "<hex string>": "<hex string>",
          ...
      },
  }
  
  // v2-compatibility torrent
  {
      "announce": "example.com",
      "info"：{
          "files": [
      		{"attr": "x", "length": 23456, "path": ["folder", "filename"]},
      		{"attr": "x", "length": 42080, "path": [".pad", "42080"]},
              ......
      	],
      	"files tree": {
               "folder": {
                    "filename": {
                         "": {"attr": "x", "length": 23456, "pieces root": "<hex string>"},
                    },
                    ...
               },
               ...
          },
          "meta version": 2,
  		"name": "test",
          "piece length": 65536,
          "pieces": "<hex string>"
  	},
      "piece layers": {
          "<hex string>": "<hex string>",
          ...
      },
  }
  ```

## 单文件制种种子结构

  而一个典型的v1、v2-only、v2-compatibility **单文件**种子结构分别如下（JSON格式）：

  ```json
  // v1 torrent
  {
      "announce": "example.com",
      "info"：{
          "length": 23456,
  		"name": "test",
          "piece length": 65536,
          "pieces": "<hex string>",
  	}
  }
  
  // v2-only torrent
  {
      "announce": "example.com",
      "info"：{
      	"files tree": {
               "filename": {
                    "": {"length": 23456, "pieces root": "<hex string>"},
               },
               ...
          },
        "meta version": 2,
  		"name": "test",
        "piece length": 65536
  	  },
      "piece layers": {
          "<hex string>": "<hex string>",
          ...
      },
  }
  
  // v2-compatibility torrent
  {
      "announce": "example.com",
      "info"：{
      	"files tree": {
               "filename": {
                    "": {"length": 23456, "pieces root": "<hex string>"},
               },
               ...
          },
          "length": 23456,
          "meta version": 2,
  		"name": "filename",
          "piece length": 65536,
          "pieces": "<hex string>"
  	},
      "piece layers": {
          "<hex string>": "<hex string>",
          ...
      },
  }
  ```

## 不同区块大小的v2-compatibility种子结构

分别使用64 KiB（65535 bytes）和4 MiB（4194304 bytes）对同一个小文件（135857 bytes/132 KB）进行测试，比较种子结构，分别如下：

```json
// piece length 65536
{
   "announce": "http://example.com/announce",
   "info": {
      "file tree": {
         "xxxxxxx.pdf": {
            "": {
               "length": 135857,
               "pieces root": "<hex>C4 46 ED 2A D3 47 2A 2E 93 3C 78 69 EE 9C DE 53 93 F3 AC 15 A3 21 B4 9A 8F 2B 14 6D 26 08 F0 E1</hex>"
            }
         }
      },
      "length": 135857,
      "meta version": 2,
      "name": "xxxxxxx.pdf",
      "piece length": 65536,
      "pieces": "<hex>91 40 E3 4C BB 31 F4 BD 49 43 D3 E0 8B 54 61 F7 1E 98 A8 6A DB DB 54 5D CE DB 69 59 26 9D 3E 84 FD D1 37 C2 51 B4 20 44 82 A1 EF 0C 22 70 06 89 04 40 9A 92 86 52 9D 58 EE 6B 38 4A</hex>"
   },
   "piece layers": {
      "<hex>C4 46 ED 2A D3 47 2A 2E 93 3C 78 69 EE 9C DE 53 93 F3 AC 15 A3 21 B4 9A 8F 2B 14 6D 26 08 F0 E1</hex>": "<hex>63 FA D1 23 4D 0F C5 59 13 B9 4E 08 A3 FD BB 1D 24 C0 2A 8C 02 94 0E A3 ED 20 F7 D0 5B D9 B3 3C 58 D1 06 F4 21 0D FC AA 85 97 13 6E 27 B0 07 D7 DB 56 3C 4A 8F 63 13 E2 E9 AC 4D D8 19 78 A2 57 05 F0 50 70 BA 9D BE 32 6B C4 6C 9A 07 A2 9D 07 E8 BD FE F3 B5 0A C3 C1 A0 74 E8 6B 02 33 2C CF</hex>"
   }
}

// piece length 4194304
{
   "announce": "http://example.com/announce",
   "info": {
      "file tree": {
         "xxxxxxx.pdf": {
            "": {
               "length": 135857,
               "pieces root": "<hex>C4 46 ED 2A D3 47 2A 2E 93 3C 78 69 EE 9C DE 53 93 F3 AC 15 A3 21 B4 9A 8F 2B 14 6D 26 08 F0 E1</hex>"
            }
         }
      },
      "length": 135857,
      "meta version": 2,
      "name": "xxxxxxx.pdf",
      "piece length": 4194304,
      "pieces": "<hex>48 A0 5A 29 00 BC 6D F4 5A AA 4D F3 96 BE 88 A5 A1 D1 13 39</hex>"
   },
   "piece layers": {}
}
```

可以看出其文件的 pieces root 项的值并没有随着做种区块大小的变动而改变。（这个功能优化或将给基于infohash以及文件大小名称的辅种方法提供新的思路）

此外，由于区块大小大于文件总大小，在4 MiB区块的种子中，其piece layers 项为空字典。这也满足协议相关定义（`For each file in the file tree that is larger than the piece size it contains one string value.`）

 ## 同一文件夹制种测试

使用同一区块大小（64 KiB）对某一文件夹进行制种，其大小和infohash对比如下：

![image-20200914211116906.png](/images/2020/09/729117162.png)

```
v1.torrent
v1 infohash 1364034113f8fb0aec628400d4b1c83b83da7dd7

v2-only.torrent
v2 infohash 284bc6feb918f054c1bec2b1a26f18232728290c3580681b66a713d8e07366ef

v2-compatibility.torrent
v1 infohash 58485c1b6dc09d84da68d37272c80d7254bcb47e
v2 infohash 1560874ef639960aafaea8cf042213dc65bf3d6f32f55bdf4dec8eec865fe058
```

很出乎我个人的主观感觉，在目录嵌套不深或者没有较长目录的情况下，使用v2体积做出来的种子体积与v1版种子相比并没有明显优势，反而因为对每个文件都构建了pieces root，以及额外的piece layers项，导致其体积远比v1大。

即使增大区块大小（4 MiB），由于文件夹深度及层级并没有变化，而且种子文件数量并没有达到引起质变的程度。其对比同样不太明显：

![image-20200920184845693.png](/images/2020/09/137236587.png)

```
multi-v1-4194304.torrent
v1 infohash 309478779a1cae156a2f0e1e0b29693faded3a58

multi-v2-only-4194304.torrent
v2 infohash 27bc289bf9e71c04197eae5b0e07516c4d1857c64ea6757f905cd36f95dbc7b5
```



# 三、目前阶段Tracker支持方法

1. 对info_hash取值：

   由于v2的种子在汇报时，其`&info_hash=` 请求字段仍然为20bytes，而在BEP52规范以及libtorrent的实现中，对于汇报的info_hash取值方法是： 种子为v2的优先裁剪sha256到前20 bytes，如果还是v1的种子，则按照原来的方法实现，其代码如下：

   ```cpp
   // from https://github.com/arvidn/libtorrent/blob/867cf863f21747f2df7290df81a8d6a57a4d0992/include/libtorrent/info_hash.hpp#L105-L110
   
   		// returns the v2 (truncated) info-hash, if there is one, otherwise
   		// returns the v1 info-hash
   		sha1_hash get_best() const
   		{
   			return has_v2() ? get(protocol_version::V2) : v1;
   		}
   ```

   所以Tracker在接受到一个种子（被上传）的时候应该首先判断一个种子是否是v2的种子，如果是，则计算`sha256($->info)`，并存储前20bytes到数据库。如果不是，则计算 `sha1($->info)`。

2. 对种子合法性的检查以及种子总大小、文件列表的获取

   在Rhilip/NexusPHP的实现中，我们对v1种子的合法性检查步骤如下 [Rhilip/NexusPHP/takeupload.php#L138-L184](https://github.com/Rhilip/NexusPHP/blob/da69b7cdf23f6b0057e0c91e26353ce2feaeb4a7/takeupload.php#L138-L184) ，这在v1中或许足够。但我们还需要对其进行更多的检验，分别为：

   - （强制）`meta version`项存在且为2。（作为我们判断种子类型的关键依据）

   - （强制）`piece layers`项、`files tree`必须存在。
   - （可选）文件length值大于pieces length值对应的文件，其pieces root值在piece layers中存在。
   - （不必要）Bencode的相关格式（特别是字典序），因为目前Bencode库基本都具有对其进行排序等功能，而用户上传再下载的过程，必然同时涉及到编解码，所以即使用户上传的种子并没有完全按照字典序，在Tracker计算info_hash以及重新下载时也会重新排序。而其他的，如 `i004e`等问题应该在Bencode库中进行解决。

   除了对种子合法性检验之外，我们还需要对种子总文件体积以及文件列表进行获取。最终形成的伪代码（**未经过验证**）如下：

   ```php
   $dict = Bencode::load($torrent_file_path);
   $info = checkTorrentDict($dict, 'info');
   $plen = checkTorrentDict($info, 'piece length', 'integer');  // Only Check without use
   $dname = checkTorrentDict($info, 'name', 'string');
   
   $filelist = array();
   
   // 对于种子是单文件还是多文件的仍然沿用原来的方法
   $totallen = $info['length'];
   if (isset($totallen)) {
       $filelist[] = array($dname, $totallen);
       $type = "single";
   } else {
       $type = "multi";
   }
   
   $torrent_v2 = false;
   if ($info['meta version'] === 2) {
       $torrent_v2 = true;
       // !!! IMPORTANT !!! 以下对于v2种子的检查仅代表本人思路，可能出现SyntaxError或者其他任何可能的意外或者错误。
       $ftree = checkTorrentDict($info, 'file tree', 'array');
       $piece_layers = checkTorrentDict($dict, 'piece layers');
       
       function loop_check_ftree($d, &$totallen = 0, &$path = []) {
           if (isset($d[''])) {  // 到子叶了
               $fn = $d[''];   // 获取子叶元素
               $ll = checkTorrentDict($fn, 'length', 'integer');
               $pieces_root = checkTorrentDict($fn, 'pieces root', 'string');
               if (strlen($pieces) != 32) {
                   bark($lang_takeupload['std_invalid_pieces']);
               }
   			
               // 检查过长文件的pieces root信息是否在 piece layers 中存在
               if ($ll > $plen) {
                   if (!array_key_exist($pieces_root, $piece_layers)) {
                       bark('long pieces not exist in piece layers');
                   }
               }
   
               $totallen += $ll;
               $filelist[] = array(implode("/", $path), $ll);  // FIXME 这样是不合适的，但是鉴于v1是这么处理的，这里沿用。事实上v2的种子本身就是树结构的。
           } else {
               $parent_path = $path;  // 暂存一下当前的路径，方便后续恢复
               foreach($d as $k => $v) {  // 遍历子叶
                   array_push($path, $k);   // 将当前项名称存入路径
                   loop_check_ftree($v, $totallen, $path);  // 回调检查
                   $path = $parent_path;  // 恢复路径
               }
           }
       }
   
       loop_check_ftree($ftree, $totallen, [$dname]);  // 从根开始检查
   } else {
       // 按照v1的方法检查并构建相关信息
   }
   
   $filetree = filelistTofiletree($filelist);
   
   // 计算infohash
   if ($torrent_v2) {
       $raw_infohash = hash('sha256', Bencode::encode($dict['info']));
       $infohash = substr($raw_infohash, 0, 20)
   } else {
       $infohash = sha1(Bencode::encode($dict['info'])); 
   }
   ```

# 四、其他/总结

1. Tracker并没有能力主动将种子从v1升级到v2版本，而同时维护支持v1和v2的方法又额外加重了Tracker的负担。此外，Bittorrent v2将区块hash放在info外，在info内仅保留文件根hash的操作（用来节约metadata），并不适合使用种子文件分化的PT站点。
2. 客户端制作向前兼容（backwards compatible）的种子得不偿失（因为对同一个区块要同时进行sha1和sha256），而只制作v2支持的种子在目前（2020年9月）没有Tracker或者btclient能识别。
3. 不可否认，随着libtorrent v2的正式释出，基于libtorrent的Deluge和qBittorrent将会可见地对bittorrent v2 进行支持。 （e.g. qBittorrent https://github.com/qbittorrent/qBittorrent/pulls?q=libtorrent+2.0 ） （但这可能并不能改变国内PT站点uTorrent横行的现状，此外Transmission 很早之前就有仍提出对bittorrent v2的支持，但目前最新的Tr 3并没有相关反映）
4. 对于同一个文件，不管做种区块如何选择，其pieces root始终相同，对于v2的种子，做种区块只能影响piece layers的情况。这或许能为自动化辅种软件提供新的思路。

5. 对于站点维护者来说，可以等等此feature相关实现，再考虑是否并入站点代码中。
