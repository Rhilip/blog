---
title: 通过编辑修改torrent文件来辅种
date: 2019-02-25 11:26:00
categories: knowledge
tags: [torrent]
permalink: /archives/1059/
---

>  本文在 [北洋园PT :: 查看主题 "【高级辅种教程】教你编辑修改torrent文件" - Powered by NexusPHP](https://tjupt.org/forums.php?action=viewtopic&forumid=15&topicid=15678) 基础上修改，如果你没有tju帐号，可以访问原作者 `@DXV5` 在Github上的原文备份 https://github.com/ylxb2016/PT-help 。
>
> 此处转载以及修改均获得原作者 @DXV5 的许可，并对他在使用多种软件对种子文件进行修改的尝试表示感谢23333~~**（虽然我本人还是推荐直接从发布站直接搜索下载**~~

## 从种子结构说起

我曾在以前的Blog中提到过Bencode的编码方式，使用winHex（如果没有，用NotePad打开看看也行）就可以直接打开你从BT站下载的torrent，可以发现torrent种子其实是一个大的字典被序列化后的字符串，用Bencode Editor解析结果如下：

![TIM截图20190225163842.png](/images/2019/02/3127570861.png)

其顶层有`announce`，`created by`，`info`等字段。在这些字段中`info`字段最为关键，因为一个种子的info_hash值就是通过对该字段进行sha1计算出来的。

```php
// 此处代码仅作示例
$info_hash = pack("H*", sha1(Bencode::encode($torrent_dict['info'])));
```

## PT站点对种子文件的修改

体感上，@DXV5 将站点对上传torrent后的修改情况大致分为以下3种情况：

	1.只修改了announce字段，或添加announce-list的list
	2.修改了announce、announce-list、source字段
	3.除了常规的修改announce、announce-list、source字段，还会添加或者修改一些字段ttg_tag,publisher-url,comment或者一些特殊的检验字段什么的。	

以TJUPT为例子，TJUPT属于情况2和情况3
	- 如果原torrent包含source字段，那么就是常规的修改announce字段，添加announce-list的list，修改source为“\[www.tjupt.org] 北洋园PT”.
	- 如果原torrent不包含source字段（比如转发TTG的种子），除了常规的修改announce字段，添加announce-list的list，会删除了TTG的torrent特有的ttg_tag字段，增加了source字段“\[www.tjupt.org] 北洋园PT”，还修改了comment字段“Torrent From TJUPT”和created by“\[www.tjupt.org]”字段。

国内、国外大部分PT站点都属于情况2，也就是修改了announce+source字段.
如果是情况3的话，就比较繁琐了，需要修改的地方比较多了，有的甚至就没必要去编辑torrent来得到相同hash的种子了

------------------------

但是实际，我们可以简单的将其再归纳为2种情况（或者说两个步骤），即修改 `root->info` 的内容（在这个层次对种子的任何修改都会更改种子的info_hash信息）以及非 `root->info`，服务器会在种子文件上传和下载的过程中对其做修改，但是两者更改的信息是不一样的。

**种子上传过程**中主要修改的是种子的`root->info`信息，诸如设root->info->private=1，添加(或者更改)root->info->source信息。而不同的info_hash会被bt软件识别为不一样的种子。这也是为什么NP构架的种子在bt软件中分开，而不是向ZX的种子那样变成添加tracker，因为各站的source是不一样的。ttg_tag这个自造的非标准tag其实也是source的一种变形。此外，非`root->info`的信息同样可以在上传的时候更改，例如NP就会在上传的时候更改root->announce信息并移除root->announce-list,root->node，以防止上传者信息泄露。

**用户下载种子文件过程**就可以修改种子的其他信息（非root->info信息）了，比如announce、announce-list、publisher-url、comment字段。这些字段的修改不影响种子的info_hash，且其修改可以为用户添加其passkey信息，或者通过comment提供展示信息。

<!--more-->

## 利用GUI工具修改单个种子

1. 仅仅需要修改torrent文件的announce字段

   这个还是比较容易的，有很多工具可以实现。
   其中全能的有：BEncode Editor和torrent-file-editor，他俩具有直接修改BEncode编码的功能，可以修改、增加、删除所有字段。

   **需要注意：**

   1. TorrentsAutoReTracker这个工具可以**批量修改**announce字段和source字段，但是同时也会将torrent文件的comment，created by，creation date字段修改掉。这样的话，无法得到相同hash的torrent文件，这个工具可以用来转发种子，不能用来直接辅种。好处在于可以在配置文件种加入好多个tracker，然后给你一个菜单再去选择这是其他工具所不能的。
   2. torrent_s2 这个工具，转自skyeysnow天雪动漫，除了可以修改tracker之外还可以制作种子。Windows版：直接把文件/文件夹拖到  torrent_s2上面即可完成制作种子；Linux版:  mktorrent_s2  -h。提供修改tracker功能以及一个鼠标右键弹出菜单的方案，见文件夹"附加功能"内。

   3. trackereditor_win32这个工具本来是BT用的，但是PT也可以用。可以批量修改announce字段，但无法修改source字段
   4. TorrentsAutoReTracker通过拖动可以用来修改announce字段，但无法修改source字段

2. 除了announce字段还需要修改source字段或者其他自定义字段

   这个具有BEncode编码编辑功能的少量工具可以实现。目前测试过的，只有BEncode Editor和torrent-file-editor可以实现。
   由于国内介绍BEncode Editor的比较多，我就来以torrent-file-editor举例吧。

   **举例Example：**

   这里提前给出一下各个阶段文件的MD5和种子的hash值，定义如下，最终目标是使种子1变成和种子4具有相同效能。
   > 1. **\[TJUPT\].Alice.in.Wonderland.2010.1080p.BluRay.x264-EbP.mkv.torrent**直接从TJUPT下载到的种子  
   > 2. **_\[EDIT-TJUPT\].Alice.in.Wonderland.2010.1080p.BluRay.x264-EbP.mkv.torrent_**基于TJUPT种子修改了announce和删除source字段的种子。  
   > 3. **_\[EDIT2-TJUPT\].Alice.in.Wonderland.2010.1080p.BluRay.x264-EbP.mkv.torrent_**基于TJUPT种子修改了announce和删除source字段、删除了announce-list字段的种子。  
   > 4. **_Alice in Wonderland.2010.1080p.Blu-ray.x264.MKV.145756.torrent_**直接从PTP下载的种子。

	1. 比如你已经下载到了TJUPT上的Alice.in.Wonderland.2010.1080p.BluRay.x264-EbP这个资源，得到了\[TJUPT\].Alice.in.Wonderland.2010.1080p.BluRay.x264-EbP.mkv.torrent文件，此时你可以用torrent-file-editor打开torrent，如下图1黄色方框中所示。
	![1.png](/images/2019/5c35b78ab4f70.png)
	将其修改为你PTP中包含个人passkey的announce地址（你可以手动从PTP下载一个torrent后，打开torrent复制其中的announce中的地址），将其修改为图2所示，这样就完成了announce字段的修改。  
	![2.png](/images/2019/5c35b78ab4bf2.png)
	
	2. 接下来进行source字段的修改，source字段的修改需要从现在的标签“主要”切换标签“树”下，进行修改，如图3黄色方框中所示，将其中的字段修改为PTP即可。一般来说即使就完成了所有的修改，另存为\[EDIT-TJUPT\].Alice.in.Wonderland.2010.1080p.BluRay.x264-EbP.mkv.torrent，此时你就可以将\[EDIT-TJUPT\].Alice.in.Wonderland.2010.1080p.BluRay.x264-EbP.mkv.torrent加载到utorrent进行辅种了。只要torrent文件具有相同的torrent hash对于utorrent以及tracker服务器等来说，这其实就是一个种子了，即使他们的MD5值不一定不用。
	![3.png](/images/2019/5c35b78ab43c8.png)
	
	3. 然而，你可能会得到一个红种提示你该种子未注册。这个种子可能是比较早期的原因，这个时候PTP官方下载的种子其实并没有source字段，这个种子其实就相当于我上边说的第一种比较理想的情况了，但是因为这个种子被上传到TJUPT的时候被添加了source字段，所以咱们需要手动把source字段删除，这时候得到的hash应该和PTP直接下载到的Alice in Wonderland.2010.1080p.Blu-ray.x264.MKV.145756.torrent的hash一模一样了，此时直接加载到utorrent就可以了。其实这时已经可以告一段落了，但是这时你检验[EDIT-TJUPT].Alice.in.Wonderland.2010.1080p.BluRay.x264-EbP.mkv.torrent的MD5发现和Alice in Wonderland.2010.1080p.Blu-ray.x264.MKV.145756.torrent的MD5不同，也就是说他俩严格意义上海不是相同的文件，为了得到一模一样的MD5，你需要把[EDIT-TJUPT].Alice.in.Wonderland.2010.1080p.BluRay.x264-EbP.mkv.torrent里的announce-list字段删除，因为PTP种子里Alice in Wonderland.2010.1080p.Blu-ray.x264.MKV.145756.torrent并没有announce-list字段，这时另存为\[EDIT2-TJUPT\].Alice.in.Wonderland.2010.1080p.BluRay.x264-EbP.mkv.torrent，检验一下就发现MD5一样了，现在可以说我们通过编辑制作出了一模一样的torrent文件了，这时你去辅种，更是毫无疑问，因为这个文件和你从PTP下载下来的一模一样！是真正意义上的同一个文件。 
	![4.png](/images/2019/5c35b78ab31b6.png)

	> 因为PTP上存在有新旧2种模式的种子，所以大家要辅种PTP种子的时候，可以分别批量制作2次种子，然后再辅种，把其中的红种删除即可。另外，torrent文件里存在mkv之外的文件，一般来说是没法成功辅种的，因为PTP要去种子不能有nfo，sample之类的资源，所以这个种子并不是从PTP自己转载的torrent，这样的种子是没法取修改来辅种的。辅种第一步可以检查TJUPT上下载下来的这个torrent的comment字段，是不是有**https://XXXXXXXXXXXX/torrents.php?id=21322&torrentid=145756**这样的字段，有的话一般说明是直接从PTP转载来的种子而不是上传者自行制作的torrentr。  

## 利用CLI工具批量修改种子

### 【python】xseed命令

说明页： https://github.com/whatbox/xseed

在linux或mac或WSL下，请先安装好git和python-pip工具，先下载xseed命令行工具

```bash
git clone https://github.com/whatbox/xseed  
pip install bencode  
chmod +x ./xseed  
cp ./xseed /usr/bin/xseed  
xseed -h  
```

在windows下，python2可行，python3貌似需要自己安装比较多的模块，不兼容？不推荐。

```
打开https://raw.githubusercontent.com/whatbox/xseed/master/xseed  
复制文本到记事本，粘贴，另存为xseed.py  
pip install bencode  
然后在xseed.py的文件夹（或者你放到环境变量的文件中）输入python xseed.py -h即可查看到命令帮助文件  
```

帮助命令如下

> usage: xseed [-h] [-v] [-e] [-o OUTFILE] [-d PATH] [-a URL] [-p] [-n]
> [-c COMMENT]
> files [files ...]
>
> positional arguments:
> files files to be modified
>
> optional arguments:
> -h, --help show this help message and exit
> -v, --verbose switch on verbose mode
> -e, --edit-in-place overwrite files without prompting
> -o OUTFILE, --output OUTFILE
> specify output filename. (can not be used if multiple
> files are given)
> -d PATH, --directory PATH
> specify a directory to save output to
> -a URL, --announce URL
> replace announce-url with the one specified
> -p, --private make torrent private
> -n, --no-cross-seed do not randomize info hashes
> -c COMMENT, --comment COMMENT
> replace comment with the one specified

**举例：**

1. 修改某个torrent的tracker并另存为123.torrent（默认是直接在原torrent上修改的）

  ```bash
xseed -o 123.torrent -a http://test.com/announce Baby.Driver.2017.720p.BluRay.DD5.1.x264-decibeL.torrent  
  ```

2. 直接在原torrent文件上批量修改tracker

  ```bash
xseed -ea http://test.com/announce ./temp/*.torrent   
  ```

### 【python2】pyrocore套装(mktor,chtor,lstor)

<https://pyrocore.readthedocs.io/en/latest/index.html>
<https://github.com/pyroscope/pyrocore>
pyrocore是一个强大的套装工具，>这包括：

命令行工具用于自动执行常见任务，例如torrent文件创建，以及 过滤和批量更改已加载的种子。
rTorrent扩展，如rTorrent队列管理器和统计信息（正在进行中）。
所有这些都基于pyrocorePython包，您可以使用它来编写自己的脚本，以满足标准工具未涵盖的任何特殊需求。

------

安装方法一：（推荐）
在linux或mac或WSL或者windows下，请先安装好python-pip工具

```
pip2 install pyrocore  
```

安装方法二：
以Ubuntu16.04为例，root身份安装会失败，请切换为普通账户安装！

```
sudo apt-get install python python-dev python-virtualenv python-pip \  
python-setuptools python-pkg-resources git build-essential  
mkdir -p ~/bin ~/.local  
git clone "https://github.com/pyroscope/pyrocore.git" ~/.local/pyroscope  
  
\# Pass "/usr/bin/python2", or whatever else fits, to the script as its  
\# 1st argument, if the default of "/usr/bin/python" is not a suitable  
\# version.  
~/.local/pyroscope/update-to-head.sh  
  
\# Check success  
pyroadmin --version # call "exec $SHELL -l" if this fails, and retry  
  
```

------

这个套装里有很多命令，

> lstor显示torrent文件的信息info。
> mktor制作torrent种子，支持辅种（cross seeding）
> chtor更改现有torrent元文件，例如添加快速恢复信息。
> hashcheck根据给定torrent元文件的来检验文件。
> pyrotorque是rTorrent的伴随守护进程，它处理自动化任务，例如队列管理，通过文件系统通知从目录树加载即时元文件，以及其他后台任务。
> rtsweep按照给定顺序的规则清理磁盘空间。这些规则是配置的一部分，并确定在新项目需要磁盘空间时首先要删除的内容。
> pyroadmin是管理任务的助手（主要是配置处理）。
> rtevent，rtmv，rtsweep，rtxmlrpc都是rtorrent的配套工具

安装完毕来看一下几个命令的使用帮助：

```
chtor -h  
```

> Usage: chtor [options] ...
>
> chtor 0.5.3 from /usr on Python 2.7.12
> Copyright (c) 2009 - 2017 Pyroscope Project
>
> Change attributes of a bittorrent metafile.
>
> For more details, see the full documentation at
>
> <https://pyrocore.readthedocs.io/>
>
> Options:
> --version show program's version number and exit
> -h, --help show this help message and exit
> -q, --quiet omit informational logging
> -v, --verbose increase informational logging
> --debug always show stack-traces for errors
> --cron run in cron mode (with different logging
> configuration)
> --config-dir=DIR configuration directory [~/.pyroscope]
> --config-file=PATH additional config file(s) to read
> -D KEY=VAL [-D ...], --define=KEY=VAL [-D ...]
> override configuration attributes
> -n, --dry-run don't write changes to disk, just tell what would
> happen
> -V, --no-skip do not skip broken metafiles that fail the integrity
> check
> -o PATH, --output-directory=PATH
> optional output directory for the modified metafile(s)
> -p, --make-private make torrent private (DHT/PEX disabled)
> -P, --make-public make torrent public (DHT/PEX enabled)
> -s KEY=VAL [-s ...], --set=KEY=VAL [-s ...]
> set a specific key to the given value; omit the '=' to
> delete a key
> -r KEYcREGEXcSUBSTc [-r ...], --regex=KEYcREGEXcSUBSTc [-r ...]
> replace pattern in a specific key by the given
> substitution
> -C, --clean remove all non-standard data from metafile outside the
> info dict
> -A, --clean-all remove all non-standard data from metafile including
> inside the info dict
> -X, --clean-xseed like --clean-all, but keep libtorrent resume
> information
> -R, --clean-rtorrent remove all rTorrent session data from metafile
> -H DATAPATH, --hashed=DATAPATH, --fast-resume=DATAPATH
> add libtorrent fast-resume information (use {} in
> place of the torrent's name in DATAPATH)
> -a URL, --reannounce=URL
> set a new announce URL, but only if the old announce
> URL matches the new one
> --reannounce-all=URL set a new announce URL on ALL given metafiles
> --no-ssl force announce URL to 'http'
> --no-cross-seed when using --reannounce-all, do not add a non-standard
> field to the info dict ensuring unique info hashes
> --comment=TEXT set a new comment (an empty value deletes it)
> --bump-date set the creation date to right now
> --no-date remove the 'creation date' field

```
mktor -h  
```

> Usage: mktor [options] ... |
>
> mktor 0.5.3 from /usr on Python 2.7.12
> Copyright (c) 2009 - 2017 Pyroscope Project
>
> Create a bittorrent metafile.
>
> If passed a magnet URI as the only argument, a metafile is created
> in the directory specified via the configuration value 'magnet_watch',
> loadable by rTorrent. Which means you can register 'mktor' as a magnet:
> URL handler in Firefox.
>
> For more details, see the full documentation at
>
> <https://pyrocore.readthedocs.io/>
>
> Options:
> --version show program's version number and exit
> -h, --help show this help message and exit
> -q, --quiet omit informational logging
> -v, --verbose increase informational logging
> --debug always show stack-traces for errors
> --cron run in cron mode (with different logging
> configuration)
> --config-dir=DIR configuration directory [~/.pyroscope]
> --config-file=PATH additional config file(s) to read
> -D KEY=VAL [-D ...], --define=KEY=VAL [-D ...]
> override configuration attributes
> -p, --private disallow DHT and PEX
> --no-date leave out creation date
> -o PATH, --output-filename=PATH
> optional file name (or target directory) for the
> metafile
> -r NAME, --root-name=NAME
> optional root name (default is basename of the data
> path)
> -x PATTERN [-x ...], --exclude=PATTERN [-x ...]
> exclude files matching a glob pattern from hashing
> --comment=TEXT optional human-readable comment
> -s KEY=VAL [-s ...], --set=KEY=VAL [-s ...]
> set a specific key to the given value; omit the '=' to
> delete a key
> --no-cross-seed do not automatically add a field to the info dict
> ensuring unique info hashes
> -X LABEL, --cross-seed=LABEL
> set additional explicit label for cross-seeding
> (changes info hash, use '@entropy' to randomize it)
> -H, --hashed, --fast-resume
> create second metafile containing libtorrent fast-
> resume information

```
lstor -h  
```

> lstor 0.5.3 from /usr on Python 2.7.12
> Copyright (c) 2009 - 2017 Pyroscope Project
>
> List contents of a bittorrent metafile.
>
> For more details, see the full documentation at
>
> <https://pyrocore.readthedocs.io/>
>
> Options:
> --version show program's version number and exit
> -h, --help show this help message and exit
> -q, --quiet omit informational logging
> -v, --verbose increase informational logging
> --debug always show stack-traces for errors
> --cron run in cron mode (with different logging
> configuration)
> --reveal show full announce URL including keys
> --raw print the metafile's raw content in all detail
> -V, --skip-validation
> show broken metafiles with an invalid structure
> -o KEY,KEY1.KEY2,..., --output=KEY,KEY1.KEY2,...
> select fields to print, output is separated by TABs;
> note that __file__ is the path to the metafile,
> __hash__ is the info hash, and __size__ is the data
> size in bytes

```
hashcheck -h  
```

> Usage: hashcheck [options] []
>
> hashcheck 0.5.3 from /usr on Python 2.7.12
> Copyright (c) 2009 - 2017 Pyroscope Project
>
> Check a bittorrent metafile.
>
> For more details, see the full documentation at
>
> <https://pyrocore.readthedocs.io/>
>
> Options:
> --version show program's version number and exit
> -h, --help show this help message and exit
> -q, --quiet omit informational logging
> -v, --verbose increase informational logging
> --debug always show stack-traces for errors
> --cron run in cron mode (with different logging
> configuration)
> --config-dir=DIR configuration directory [~/.pyroscope]
> --config-file=PATH additional config file(s) to read
> -D KEY=VAL [-D ...], --define=KEY=VAL [-D ...]
> override configuration attributes

------

我们只介绍这里的用来制作种子的mktor，用来编辑种子的chtor，用来显示种子信息的lstor命令，用来检验种子完整性的hashcheck命令

------

**mktor举例**

1.将当前目录下的文件全部制作为种子，并保存到/home/torrent文件夹下,并排除nfo文件

```
ls -1 | xargs -d$'\\n' -I{} mktor -p --exclude *.nfo -o /home/torrent "{}" "http://test.com"  
```

2.将当前目录下的文件夹全部制作为种子，并保存到当前文件夹下,并排除nfo文件

```
find . -mindepth 1 -maxdepth 1 -type d \\! -name ".*" -print0 | sort -z | xargs -0I{} mktor --exclude *.nfo -p "{}" "http://test.com"
```

------

**lstor举例** 

1.只显示当前文件夹下所有种子的hash字段和文件大小、种子名字段，

```
lstor -qo \_\_hash\_\_,info.piece\ length,info.name *.torrent  
```

2.显示123.torrent的简单信息

```
lstor 123.torrent  
```

3.显示123.torrent全部的信息，默认会打码passkey

```
lstor --raw 123.torrent  
```

4.显示123.torrent信息，并显示passkey

```
lstor --reveal 123.torrent  
```

------

**chtor举例 **

这个chtor工具相比其他BEncode工具较为完整，可以修改增加删除任何字段.可以与GUI工具BEncode Editor和torrent-file-editor媲美.
需要注意的是如果字符串在字典（Dictionary）之下，需要在字符串前加上字典名，如一般来说source字段位于torrent结构树（tree）中的info之下，那么修改或者设置的source的时候，就需要写为info.source；而如果要删除某个字段，则直接“-s 字段名”即可，不用加等号来赋值，如“chtor -s info.source 123.torrent”即可删除123.torrent中的source字段.

1. 将本目录下所有种子的tracker修改，并修改source字段为PTP，并禁止默认添加的x_cross_seed字段，并另存到此文件夹下的torrent文件夹

```
chtor --reannounce-all=http://test.com -s info.source=PTP --no-cross-seed *.torrent ./torrent/  
```

2. 将本目录下所有种子的tracker修改，并禁止默认添加的x_cross_seed字段，直接修改在原torrent文件上.

```
chtor --reannounce-all=http://test.com --no-cross-seed *.torrent  
```

3. 将本目录下所有种子的tracker修改，并删除source字段，并禁止默认添加的x_cross_seed字段，并另存到此文件夹下的torrent文件夹

```
chtor --reannounce-all=http://test.com -s info.source --no-cross-seed *.torrent -o ./torrent/  
```

------

**【校验文件】hashcheck举例**

1. 校验种子123.torrent对应的123文件夹是否完整

```
hashcheck -v 123.torrent ./123  
```

### 【python3】torf-cli工具

<https://github.com/rndusr/torf>
<https://pypi.org/project/torf/>
<https://github.com/rndusr/torf-cli>
<https://rndusr.github.io/torf-cli/torf.1.html>
在linux或mac或WSL下，请先安装好python-pip工具，先下载命令行工具
需要注意的是，此工具需要python3

```bash
pip install torf  
pip install pyxdg  
pip3 install torf-cli  
torf -h  
```

------

**使用说明：**

```
torf - CLI tool to create, read and edit torrent files

USAGE
    torf PATH [OPTIONS] [-o TORRENT]
    torf -i TORRENT
    torf -i TORRENT [OPTIONS] -o NEW TORRENT

ARGUMENTS
    PATH                   Path to torrent's content
    --exclude, -e EXCLUDE  File matching pattern that is used to exclude
                           files in PATH
    --in, -i TORRENT       Read metainfo from TORRENT
    --out, -o TORRENT      Write metainfo to TORRENT (default: NAME.torrent)
    --name, -n NAME        Torrent name (default: basename of PATH)
    --tracker, -t TRACKER  Announce URL
    --webseed, -w WEBSEED  Webseed URL
    --private, -p          Forbid clients to use DHT and PEX
    --comment, -c COMMENT  Comment that is stored in TORRENT
    --date, -d DATE        Creation date as YYYY-MM-DD[ HH:MM[:SS]], 'now'
                           or 'today' (default: 'now')
    --source, -s SOURCE    Add "source" field
    --xseed, -x            Randomize info hash

    --notracker, -T        Remove trackers from TORRENT
    --nowebseed, -W        Remove webseeds from TORRENT
    --noprivate, -P        Remove private flag from TORRENT
    --nocomment, -C        Remove comment from TORRENT
    --nodate, -D           Remove date from TORRENT
    --nosource, -S         Remove "source" field from TORRENT
    --noxseed, -X          De-randomize info hash of TORRENT
    --nocreator, -R        Remove creator from TORRENT
    --notorrent, -N        Don't create torrent file
    --nomagnet, -M         Don't create magnet link

    --yes, -y              Answer all yes/no prompts with "yes"
    --config, -f FILE      Read configuration from FILE
                           (default: ~/.config/torf/config
    --noconfig, -F         Ignore configuration file
    --profile, -z PROFILE  Use options from PROFILE

    --human, -u            Force human-readable output
    --nohuman, -U          Force machine-readable output
    --help, -h             Show this help screen and exit
    --version, -V          Show version number and exit
```

------

**举例：**

1. 制作一个名为foo.torrent的种子，并包含2个tracker

```
torf path/to/foo -t http://bar:123/announce -t http://baz:321/announce --private  
```

2. 显示foo.torrent的信息

```
torf -i foo.torrent  
```

3. 修改种子的comment字段，删除制作时间字段，并另存为bar.torrent

```
torf -i foo.torrent -c 'New comment' -D -o bar.torrent  
```

4. 显示foo.torrent里文件列表

```
torf -i foo.torrent | grep '^Files' | cut -f2-  
```

5. 修改种子的source字段为"PTP"，并另存为bar2.torrent

```
torf -i foo.torrent -s PTP -o bar2.torrent
```

### transmission套装之transmission-edit命令

transmission很是强大，包括transmission-create, transmission-daemon, transmission-edit, transmission-gtk, transmission-qt, transmission-remote, transmission-show,transmission-cli.网络上的教程很多，我就不再赘述了。
<https://linux.die.net/man/1/transmission-edit>
<https://linux.die.net/man/1/transmission-cli>
<https://github.com/transmission/transmission/wiki/Scripts>

------

** 安装transmission后，查看命令帮助**

```
transmission-edit -h  
```

> Usage: transmission-edit [options] torrent-file(s)

Options:
-h --help Display this help page and exit
-a --add Add a tracker's announce URL
-d --delete Delete a tracker's announce URL
-r --replace Search and replace a substring in the announce URLs
-V --version Show version number and exit

------

**举例：**

1. 在网站上重置passkey后，批量修改torrent文件的passkey

```
transmission-edit -r old-passcode new-passcode ~/.config/transmission/torrents/*\\.torrent  
```

2. 添加种子的tracker

```
transmission-edit -a http://test.com ~/.config/transmission/torrents/*\\.torrent  
```

3. 删除种子的tracker

```
transmission-edit -d http://test.com ~/.config/transmission/torrents/*\\.torrent  
```

### 【python3】dottorrent-cli命令

<https://github.com/kz26/dottorrent-cli>
<https://github.com/kz26/dottorrent>
<https://github.com/kz26/dottorrent-gui>
在linux或mac或WSL或windows下，请先安装好python-pip工具，先下载命令行工具

```bash
pip3 install dottorrent-cli  
dottorrent -h  
```

**用法**

> usage: dottorrent [-h] [--tracker TRACKER] [--web_seed WEB_SEED]
> [--piece_size PIECE_SIZE] [--private] [--source SOURCE]
> [--exclude RE] [--comment COMMENT] [--date DATE] [--md5]
> [--verbose]
> path output_path Create a .torrent file
> positional arguments:
> path path to file/directory to create torrent from
> output_path Output path for created .torrent file. If a directory
> is provided, the filename will be automatically
> generated based on the input.
> optional arguments:
> -h, --help show this help message and exit
> --tracker TRACKER, -t TRACKER
> tracker URL (can be specified multiple times)
> --web_seed WEB_SEED, -w WEB_SEED
> web seed URL (can be specified multiple times)
> --piece_size PIECE_SIZE, -s PIECE_SIZE
> piece size, e.g. 16KB, 1M. Leave unspecified for
> automatic piece size
> --private, -p set private flag (useful for private trackers)
> --source SOURCE source string (useful for private trackers)
> --exclude RE, -x RE filename patterns that should be excluded (can be
> specified multiple times)
> --comment COMMENT, -c COMMENT
> string for the torrent comment field
> --date DATE, -d DATE Torrent creation date. Valid values: unix
> timestamp/none/now (default: now)
> --md5 Add per-file MD5 hashes
> --verbose, -v verbose mode

这是一个制作种子，torrent的命令行工具，

**举例：**

1. 将123.mkv制作一个名为test.torrent

```
dottorrent -t http://test.com/announce -v 123.mkv ./test.torrent  
```

2. 将123.mkv制作一个名为test1.torrent，区块大小16MB,私有种子，source设置为PTP，添加评论"this is a test file"，并将文件MD5值加入torrent中。

```
dottorrent -t http://test.com/announce -s 16M -p --source PTP -c "this is a test file" --md5 -v xseed ./test1.torrent  
```


## 使用Python库自定义修改种子

此处演示使用Python3的bencoder库对种子进行编辑并保存，你可以结合os.walk等遍历函数批量编辑

安装 `pip3 install bencoder`

使用例

```python
import bencoder
f = open("2.torrent","rb") # 读入文件
d = bencoder.decode(f.read()) # 赋值
del d[b"comment"] # 删除字段
d[b'created']=b'test' # 添加字段并赋值
with open("2.torrent","wb") as n: # 以写入权限打开文件
    n.write(bencoder.encode(d))  # 写入文件
exit()
```