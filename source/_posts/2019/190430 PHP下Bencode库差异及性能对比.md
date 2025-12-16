---
title: PHP下Bencode库差异及性能对比
date: 2019-04-30 04:55:00
categories: PHP
tags: []
permalink: /archives/1064/
---

如果你有过注意，我曾在最近为国内某一PT站点更换了其Bencode库。究其原因在于，NexusPHP自带的Bencode库解析出来的Array中含有较多的无用元素，且性能较低，在一定程度上拖慢了种子上传过程中的解析速度，此外还占用过多内存。

## 概览

本次对比的对象有[NexusPHP](https://github.com/ZJUT/NexusPHP)自带的、本人新写[RidPT](https://github.com/Rhilip/RidPT)（但是还没有写完的）所用的Bencode库，以及其他在 https://packagist.org/ 中注册有Bencode库标识（tag）的相关库，列表如下：

|                  PHP <br />Bencode Library                   |  Ver.   |  Size   | Encode From <br />Array/Object | Decode From <br />String/File Loc |
| :----------------------------------------------------------: | :-----: | :-----: | :----------------------------: | :-------------------------------: |
| [NexusPHP(benc.php)](https://github.com/ZJUT/NexusPHP/blob/master/include/benc.php) |    -    | 2.56 KB |              √/×               |                √/√                |
| [RidPT(Bencode.php)](https://github.com/Rhilip/RidPT/blob/master/framework/Bencode/Bencode.php) |    -    | 4.32 KB |              √/×               |                √/√                |
|                       ---------------                        |   --    |  ----   |             ------             |              ------               |
|  [sandfoxme/bencode](https://github.com/sandfoxme/bencode)   |  1.3.0  |  62 KB  |              √/√               |                √/√                |
|    [rych/bencode](https://github.com/rchouinard/bencode)     |  1.0.0  |  35 KB  |              √/×               |                √/×                |
| [dsmithhayes/bencode](https://github.com/dsmithhayes/bencode) |  0.1.3  | 529 KB  |              √/×               |                √/×                |
|        [s9e/Bencode](https://github.com/s9e/Bencode)         |  1.1.1  |  14 KB  |              √/×               |                √/×                |
|       [nrk/bencoder](https://github.com/nrk/bencoder)        |  1.0.0  | 132 KB  |              √/×               |                √/√                |
| [pure-bencode/pure-bencode](https://github.com/jesseschalken/pure-bencode) |   1.1   | 178 KB  |              √/×               |                √/×                |
| [ppokatilo/bencode](https://github.com/SHyx0rmZ/php-bencode) |  1.0.0  |  4 KB   |              √/√               |                √/×                |
|     [nirosa/bencode](https://github.com/nirosa/bencode)      |   dev   |  13 KB  |              √/×               |                √/×                |
| [OPSnet/bencode-torrent](https://github.com/OPSnet/bencode-torrent) | v0.11.0 |  41 KB  |              ×/×               |                √/√                |
| [akatsuki/bencode](https://github.com/aurimasniekis/akatsuki-bencode) |  1.0.0  |  10 KB  |              √/√               |                √/×                |

> 注1. RidPT使用的Bencode库基于 [OPSnet/bencode-torrent](https://github.com/OPSnet/bencode-torrent) 改写，并学习了 [sandfoxme/bencode](https://github.com/sandfoxme/bencode) 的一些暴露方法。
>
> 注2. 从Decode From File Loc的意思是库内置有相关方法，可以直接给文件地址就可以生成对应的Array，而不用外置使用file_get_content()或者fread()方法（其库内有内置该方法，如以下伪代码 `Bencode::load($file_loc [, $max_torrent_size] );`

## 太长不看

**推荐使用以下库： [RidPT(Bencode.php)](https://github.com/Rhilip/RidPT/blob/master/framework/Bencode/Bencode.php)  替代原NexusPHP中benc！！！！**

> 替换方法：
 - 全盘更换Bencode库，参见： [tjupt#e48a4c19](https://github.com/zcqian/tjupt/commit/e48a4c1932ff84d1cd77a0022e30c07421cb55ab)
 - 仅替换NPHP的bdec_file方法，参见： [提升NexusPHP解析种子文件性能(优化benc.php) - ChenZhuYuの小屋 - CSDN博客](https://blog.csdn.net/chenzhuyu/article/details/100074696) （ 据真红酱本人测试，更换后 `4M种子解析不到1s` ）


<!--more-->

## Bencode编码规则

我曾在某个未完成（实质可能是坑掉）的Blog系列中提及到Bencode的编码规则如下：

| data types | raw           | encoded       |
| :--------: | ------------- | :------------ |
|    int     | -42           | i-42e         |
|   string   | 'spam'        | 4:spam        |
|    list    | ['XYZ', 4321] | l3:XYZi4321ee |
|    dict    | {'XYZ': 4321} | d3:XYZi4321ee |

请简单的记忆下，方便我们后续介绍~

## NexusPHP解析方法

在进入主题前，我们先来说说NexusPHP的“原罪”，仅以以下代码为例：

```php
<?php

/*
 * Bencoded structure represented in JSON format:
 * {
 *   "string": "uTorrent/3130",
 *   "int": 1548400939,
 *   "list": ["UTF-8","GBK"],
 *   "info": {
 *      "length": 364,
 *      "name": "test.rar"
 *   }
 * }
 */

include './benc.php';  // Downloaded From https://github.com/ZJUT/NexusPHP/blob/master/include/benc.php

$raw = 'd4:infod6:lengthi364e4:name8:test.rare3:inti1548400939e4:listl5:UTF-83:GBKe6:string13:uTorrent/3130e';

print_r($raw);
echo '<pre>';
print_r(bdec($raw));
echo '</pre>';
```

详细结果可见： https://pastebin.com/raw/iPG9Tp5h

从中，我们可以看到，NexusPHP的内置Bencode库将任何字段都解析成以一个大字典为顶层，其内部各键值对以以下格式的Array

```php
[length] => Array
        (
              [type] => integer
              [value] => 364
              [strlen] => 5
              [string] => i364e
        )
```

其中，键值中`type`的取值分别为`dictionary,list,integer,string`，对应Bencode编码规则中的4种格式，`value`为具体值，视type的取值可能为Array、Int、String类型中的一种。`string`为该字段编码后的结果（准确的说是decode过程中的截取的实际字段），`strlen`则为string字段的长度。

根据这种结构，在最终的顶层字典中，string键值一定为输入的字符串（此处存在漏洞，应该是原始输入字符串中成功解析出来的字符串），如下说明：

```php
<?php

include './benc.php';

$raw_1 = 'd4:infod6:lengthi364e4:name8:test.rare3:inti1548400939e4:listl5:UTF-83:GBKe6:string13:uTorrent/3130e';
$raw_2 = $raw_1 . 'i364e';
$bdec_1 = bdec($raw_1);
$bdec_2 = bdec($raw_2);

echo '<pre>';
print_r($bdec_1);
print_r($bdec_2);
echo '</pre>';
var_dump($bdec_1['string'] == $bdec_2['string']);  // True
```

详细结果见： https://pastebin.com/9MzjhzRj

进一步使用 array_diff 可以知道 `$bdec_1` 以及 `$bdec_2` 是相同的，且 `$raw_2` 附加的字段其实并没有被解析出来，而是在第一个字典被解析出来之后就被抛弃了。（这里是NP与其他解析库不同的地方，会在后面异常处理部分做进一步说明）

同样，decode出来的Array结构复杂使得encode时候构造形式一样变得复杂，例如下载种子时候添加多tracker的代码 [download.php#L92_L114](https://github.com/ZJUT/NexusPHP/blob/master/download.php#L92_L114) ，对一个值的更改往往需要更改构造字典的多个键值对。所以在Tracker部分，NP的实现就直接用字符串拼接来完成了。

## Array到底是Dict还是List

那么，为什么NexusPHP会需要这么麻烦的构造问题，我个人觉得是因为PHP的Array对象。

在其他语言中，或许都有明确的Dict以及List对象，而PHP中，这些都合并为Array（*我并不是说大Array不好，个人还是比较喜欢的2333*）。而Bencode编码规则中，对Dict和List有不同的编码规则，所以需要有一个明确的方法来确定，所以NexusPHP的解析库直接将其类型写入其`type`中，之后便可以根据这个type情况，进行编码和解码。

那么其他库在encode的时候是怎么区分是Dict还是List的那，列表如下：

| Bencode Library           | Code Line of encode PHP array                                |
| ------------------------- | ------------------------------------------------------------ |
| NexusPHP/benc.php         | https://github.com/ZJUT/NexusPHP/blob/master/include/benc.php#L6-L14 |
| Rhilip/RidPT              | https://github.com/Rhilip/RidPT/blob/master/framework/Bencode/Bencode.php#L95-L116 |
| sandfoxme/bencode         | https://github.com/sandfoxme/bencode/blob/master/src/Engine/Encoder.php#L52-L59 |
| rchouinard/bencode        | https://github.com/rchouinard/bencode/blob/master/src/Encoder.php#L73-L76 |
| dsmithhayes/bencode       | 使用库内置类型定义                                           |
| s9e/Bencode               | https://github.com/s9e/Bencode/blob/master/src/Bencode.php#L216-L251 |
| nrk/bencoder              | https://github.com/nrk/bencoder/blob/master/lib/Bencoder/Bencode.php#L130-L143 |
| pure-bencode/pure-bencode | https://github.com/jesseschalken/pure-bencode/blob/master/Bencode.php#L12-L28 |
| ppokatilo/bencode         | https://github.com/SHyx0rmZ/php-bencode/blob/master/src/Encoder.php#L12-L27 |
| nirosa/bencode            | https://github.com/nirosa/bencode/blob/master/src/Bencode.php#L30-L35 |
| OPSnet/bencode-torrent    | https://github.com/OPSnet/bencode-torrent/blob/master/src/Bencode.php#L141-L157 |
| akatsuki/bencode          | https://github.com/aurimasniekis/akatsuki-bencode/blob/master/src/Encoder.php#L36-L42 |

除了NP采用的库将类型标记在键值对中的情况外，其他库区分Dict还是Array的方法大体上可以将其分为以下几类（也就是根据判断是索引数组还是关联数组的方法）：

> update: PHP 8.1之后可以使用 `array_is_list`方法直接判断

1. foreach遍历取键值，当其中键与遍历index不对应或者键中有string类型即判断为Dict。其中`sandfoxme/bencode`，`nrk/bencoder`（判断键是否为string类型），`pure-bencode/pure-bencode`，`OPSnet/bencode-torrent`都是这样实现的。以`sandfoxme/bencode`的实现为例，代码如下：

    ```php
function isSequentialArray(array $array): bool
        {
            $index = 0;
            foreach ($array as $key => $value) {
                if ($key !== $index) {
                    return false;
                }
                $index += 1;
            }
            return true;
        }
   ```
   
2. 数组0位断言，当`$array[0]`存在（且为int类型）时，判断为List，否则判断为Dict。这种实现会存在一个问题，就是`$array["0"]`的情况，不过个人觉得没多大问题。`nirosa/bencode`，`akatsuki/bencode`，`rchouinard/bencode`均为以下实现。代码如下：

    ```php
    // nirosa/bencode
    $list = false;
    if (is_int(array_keys($d)[0])) {
    	$list = true;
    }
    
    // aurimasniekis/bencode
    if (is_array($data) && (isset ($data[0]) || empty ($data))) {
       return $this->encodeList($data);
    }
    if (is_array($data)) {
       return $this->encodeDict($data);
    }
    ```

3. 其他剩下的也差不多是第一种的变种，但效率远不如前两者，因为他们会比较所有的键，而第一种基本上都有提前跳出循环的设定。例如：

	1. `s9e/Bencode`:  将array_keys结果和range生成的索引数组做对比，全等时为List，不然做Dict解析
	
	```php
		protected static function encodeArray(array $value)
		{
			if (empty($value))
			{
				return 'le';
			}
			if (array_keys($value) === range(0, count($value) - 1))
			{
				return 'l' . implode('', array_map([__CLASS__, 'encode'], $value)) . 'e';
			}
			// Encode associative arrays as dictionaries
			return self::encodeDictionary((object) $value);
		}
		/**
		* Encode given object instance into a dictionary
		*
		* @param  object $dict
		* @return string
		*/
		protected static function encodeDictionary($dict)
		{
			$vars = get_object_vars($dict);
			ksort($vars);
			$str = 'd';
			foreach ($vars as $k => $v)
			{
				$str .= strlen($k) . ':' . $k . self::encode($v);
			}
			$str .= 'e';
			return $str;
		}
	```
	
	2. `ppokatilo/bencode`： 使用array_reduce回调判断每一个键的类型是string还是int
	
	```php
	        if (is_array($data)) {
	            list($allStrings, $allIntegers) = array_reduce(array_keys($data), function ($flags, $key) {
	                list($allStrings, $allIntegers) = $flags;
	                return [ $allStrings && is_string($key), $allIntegers && is_integer($key) ];
	            }, [ true, true ]);
	            if ($allIntegers) {
	                return $this->encodeList($data);
	            }
	            elseif ($allStrings) {
	                return $this->encodeDictionary($data);
	            }
	            else {
	                throw new \UnexpectedValueException();
	            }
	        }
	```

通过与其他Bencode库的实现对比，我们可以看出其实并不需要使用标记的方法，在PHP中根据Array的一些特性，就可以区分到底是Dict还是List。至于每种实现所需的单位时间和内存占用情况对比，本文就不做额外对比（因为本文更关注库Encode以及Decode的时间消耗以及占用情况），如有兴趣，读者可以另写benchmark脚本进行测试。

## 不同库Encode及Decode方法

本处对比不同Bencode库的Encode以及Decode方法入口，结果如下：

|                     PHP  Bencode Library                     |                            Encode                            |                            Decode                            |
| :----------------------------------------------------------: | :----------------------------------------------------------: | :----------------------------------------------------------: |
| [NexusPHP(benc.php)](https://github.com/ZJUT/NexusPHP/blob/master/include/benc.php) |                         `benc($obj)`                         |                          `bdec($s)`                          |
| [RidPT(Bencode.php)](https://github.com/Rhilip/RidPT/blob/master/framework/Bencode/Bencode.php) |                   `Bencode::encode($data)`                   |                   `Bencode::decode($data)`                   |
|                       ---------------                        |                            ------                            |                            ------                            |
|  [sandfoxme/bencode](https://github.com/sandfoxme/bencode)   |        `Bencode::encode($data, array $options = [])`         |   `Bencode::decode(string $bencoded, array $options = [])`   |
|    [rych/bencode](https://github.com/rchouinard/bencode)     |                  `Bencode::encode($value)`                   |  `Bencode::decode($string, $decodeType = self::TYPE_ARRAY)`  |
| [dsmithhayes/bencode](https://github.com/dsmithhayes/bencode) | `$dictionary = new Dictionary($array);`<br />`$dictionary->encode();` | `$dictionary = new Dictionary();`<br />`$ditionary->decode($string);`<br />`$buffer = $dictionary->write();` |
|        [s9e/Bencode](https://github.com/s9e/Bencode)         |                  `Bencode::encode($value)`                   |                 `Bencode::decode($bencoded)`                 |
|       [nrk/bencoder](https://github.com/nrk/bencoder)        |                `Bencode::encode($structure)`                 |                 `Bencode::decode($encoded)`                  |
| [pure-bencode/pure-bencode](https://github.com/jesseschalken/pure-bencode) |                  `Bencode::encode($value)`                   |                 `Bencode::decode($bencode)`                  |
| [ppokatilo/bencode](https://github.com/SHyx0rmZ/php-bencode) |                `new Encoder()->encode($data)`                |                `new Decoder()->decode($data)`                |
|     [nirosa/bencode](https://github.com/nirosa/bencode)      |                `new Bencode()->encode($data)`                |                `new Bencode()->decode($data)`                |
| [OPSnet/bencode-torrent](https://github.com/OPSnet/bencode-torrent) |              方法具有protect属性，无法直接调用               |         `new Bencode()->decodeString(string $data)`          |
| [akatsuki/bencode](https://github.com/aurimasniekis/akatsuki-bencode) |                `new Encoder()->encode($data)`                |                `new Decoder()->decode($data)`                |

而Decode简单字符串结果可见：https://pastebin.com/raw/V5xBhRxG

从调用方法上看，`dsmithhayes/bencode`的实现可能是所有库中实现最为麻烦的一个，也与他需要用内部Collection来规定数据类型，而不能自动识别Array的类型有关。**从对简单字符串的解析结果来看，存在内容丢失的情况。**

具有静态方法的Bencode库占多数，同时使用静态方法调用的形式较为简单，格式也相对一致，个人比较推荐使用静态方法库。这其中`s9e/Bencode` 解析出来的格式较为奇怪

`rych/bencode`在Decode的方法中可以传入第二个参数，如果指定为`self::TYPE_OBJECT`，可以返回\stdClass对象，而不是Array。（就如同`json_decode ( string `$json` [, bool `$assoc` = FALSE [, int `$depth` = 512 [, int `$options` = 0 ]]] ) `的第二个参数作用）

而动态调用的库中，`nirosa/bencode`是同时具有encode以及decode两种方法的库，而另两个需要分别new不同的对象才可以继续调用，个人觉得过于繁琐。此外，`ppokatilo/bencode`会把Dict解析成一个\stdClass。

## 解析速度对比

本次测试环境为PHP7.4（在本人垃圾的Surface5下），测试内容为各个库的Enocde以及Decode相同内容的时间开销，所有库均使用Composer加载，其中`nirosa/bencode`只有dev-master版本释出，不参与测试~~（其实是我懒，不想修改composer设置）~~。

测试脚本见该Repo：<https://github.com/Rhilip/php-bencode-benchmark>

基本结果如下表

|                  PHP <br />Bencode Library                   | Decode String <br />( x100000 sec) | Decode File <br />( x10000/x1 sec) | Encode Array<br />( x100000 sec) |
| :----------------------------------------------------------: | :--------------------------------: | :--------------------------------: | :------------------------------: |
| [NexusPHP(benc.php)](https://github.com/ZJUT/NexusPHP/blob/master/include/benc.php) |               1.727                |           3.495/243.483            |              0.598               |
| [RidPT(Bencode.php)](https://github.com/Rhilip/RidPT/blob/master/framework/Bencode/Bencode.php) |               0.946                |            1.447/0.108             |              0.480               |
|                       ---------------                        |         -----------------          |           --------------           |        -----------------         |
|  [sandfoxme/bencode](https://github.com/sandfoxme/bencode)   |               5.352                |            2.198/0.460             |              1.046               |
|    [rych/bencode](https://github.com/rchouinard/bencode)     |               2.950                |            1.700/1.664             |              1.359               |
| [dsmithhayes/bencode](https://github.com/dsmithhayes/bencode) |             ~~1.307~~              |          ~~1.239/0.029~~           |            ~~0.161~~             |
|        [s9e/Bencode](https://github.com/s9e/Bencode)         |               1.219                |            1.434/0.139             |              0.559               |
|       [nrk/bencoder](https://github.com/nrk/bencoder)        |               1.511                |            1.996/0.155             |              0.609               |
| [pure-bencode/pure-bencode](https://github.com/jesseschalken/pure-bencode) |               2.919                |            1.577/0.195             |              0.512               |
| [ppokatilo/bencode](https://github.com/SHyx0rmZ/php-bencode) |               1.625                |         3.119/Fatal error          |              0.711               |
| [OPSnet/bencode-torrent](https://github.com/OPSnet/bencode-torrent) |                 --                 |            1.449/0.127             |                --                |
| [akatsuki/bencode](https://github.com/aurimasniekis/akatsuki-bencode) |               3.043                |            1.709/1.346             |              1.459               |

> 注：
>
> 1. 结果均为单次测试中对应测试循环总共耗时。
> 2. 种子文件解析分别使用 `ubuntu-18.04.2-desktop-amd64.iso.torrent`(75 KB，单文件) 以及`Touhou lossless music collection v.19.torrent` (9380 KB，约6k4文件) 分别表示不同解析库解析大小文件时时间开销。
> 3. 本人的测试可能不准确，还请在你自己的环境中使用该Benchmark进行测试。（特别是大种子文件的情况，仅进行了一次循环。）

结果论的讲，与其他库相比，NexusPHP使用的benc库性能较为一般，在解析较大文件的耗时严重。其使用`fopen(),fread(),fclose()`相关方法获取文件内容，在对其进行如下patch后，其对小文件的解析性能有一定的提升。

```patch
Index: lib/NexusPHP/benc.php
IDEA additional info:
Subsystem: com.intellij.openapi.diff.impl.patch.CharsetEP
<+>UTF-8
===================================================================
--- lib/NexusPHP/benc.php	(date 1556551565000)
+++ lib/NexusPHP/benc.php	(date 1556552127272)
@@ -43,11 +43,7 @@
 	return $s;
 }
 function bdec_file($f, $ms) {
-	$fp = fopen($f, "rb");
-	if (!$fp)
-		return;
-	$e = fread($fp, $ms);
-	fclose($fp);
+	$e = file_get_contents($f);
 	return bdec($e);
 }
 function bdec($s) {
```

目前RidPT中使用的基于OPSnet/bencode-torrent的Bencode库性能较为优秀（自卖自夸2333），除此以外，`s9e/Bencode`，`nrk/bencoder`，`pure-bencode/pure-bencode`的性能也十分优良。
此外对大文件的解析中，ppokatilo/bencode`的表现差劲，直接爆了内存限制。

```trace
PHP Fatal error:  Allowed memory size of 134217728 bytes exhausted (tried to allocate 9604424 bytes) in .\vendor\ppokatilo\bencode\src\Decoder.php on line 86
PHP Stack trace:
PHP   1. {main}() .\benchmark_decode_large_torrent.php:0
PHP   2. test_ppokatilo_bencode() .\benchmark_decode_large_torrent.php:126
PHP   3. SHyx0rmZ\Bencode\Decoder->decode() .\benchmark_decode_large_torrent.php:96
PHP   4. SHyx0rmZ\Bencode\Decoder->decodeValue() .\vendor\ppokatilo\bencode\src\Decoder.php:11
PHP   5. SHyx0rmZ\Bencode\Decoder->decodeDictionary() .\vendor\ppokatilo\bencode\src\Decoder.php:23
PHP   6. SHyx0rmZ\Bencode\Decoder->decodeDictionary() .\vendor\ppokatilo\bencode\src\Decoder.php:48
PHP   7. SHyx0rmZ\Bencode\Decoder->decodeDictionary() .\vendor\ppokatilo\bencode\src\Decoder.php:48
PHP   8. SHyx0rmZ\Bencode\Decoder->decodeDictionary() .\vendor\ppokatilo\bencode\src\Decoder.php:48
PHP   9. SHyx0rmZ\Bencode\Decoder->decodeDictionary() .\vendor\ppokatilo\bencode\src\Decoder.php:48
PHP  10. SHyx0rmZ\Bencode\Decoder->decodeString() .\vendor\ppokatilo\bencode\src\Decoder.php:43
PHP  11. substr() .\vendor\ppokatilo\bencode\src\Decoder.php:86
```

## 异常处理

本次测试设置3种情况，分别如下，检查对应Bencode库的情况：

- 空字符传入
- 错误字符串传入（在正确字符串的基础上修改标记位信息）： `d5:infod6:lengthi364e4:name8:test.rare3:inti1548400939e4:listl5:UTF-83:GBKe6:string13:uTorrent/3130e`
- 附加字符串传入（在正确字符串基础上附加额外信息）：`d4:infod6:lengthi364e4:name8:test.rare3:inti1548400939e4:listl5:UTF-83:GBKe6:string13:uTorrent/3130ei18e`

结果如下

|                     PHP  Bencode Library                     |       Empty       |     Wrong      |              Extra               |
| :----------------------------------------------------------: | :---------------: | :------------: | :------------------------------: |
| [NexusPHP(benc.php)](https://github.com/ZJUT/NexusPHP/blob/master/include/benc.php) |       Null        |      Null      | 只解析正确字符串（后面直接抛弃） |
| [RidPT(Bencode.php)](https://github.com/Rhilip/RidPT/blob/master/framework/Bencode/Bencode.php) |    Fatal error    |  Fatal error   |           Fatal error            |
|                       ---------------                        | ----------------- | -------------- |        -----------------         |
|  [sandfoxme/bencode](https://github.com/sandfoxme/bencode)   |    Fatal error    |  Fatal error   |           Fatal error            |
|    [rych/bencode](https://github.com/rchouinard/bencode)     |    Fatal error    |  Fatal error   |           Fatal error            |
| [dsmithhayes/bencode](https://github.com/dsmithhayes/bencode) |      空Array      |  Fatal error   |         只解析正确字符串         |
|        [s9e/Bencode](https://github.com/s9e/Bencode)         |    Fatal error    |  Fatal error   |           Fatal error            |
|       [nrk/bencoder](https://github.com/nrk/bencoder)        |       Null        |   错误Array    |         只解析正确字符串         |
| [pure-bencode/pure-bencode](https://github.com/jesseschalken/pure-bencode) |    Fatal error    |  Fatal error   |         只解析正确字符串         |
| [ppokatilo/bencode](https://github.com/SHyx0rmZ/php-bencode) |       Null        |   错误Array    |         只解析正确字符串         |
| [akatsuki/bencode](https://github.com/aurimasniekis/akatsuki-bencode) |    Fatal error    |  Fatal error   |           Fatal error            |

从对待异常字符串decode的结果上看，NexusPHP的返回与其他不同，直接为Null，而不抛出异常，这也可能与该库诞生较早有关。而在对待错误字符串的情境下，`nrk/bencoder`以及`ppokatilo/bencode`会返回错误的Array，增加后续判断的成本。

