---
title: NexusPHP优化(4) Torrent表拆分及独立搜索引擎
date: 2023-03-12 12:33:00
categories: pt
tags: []
permalink: /archives/1275/
---

在很久很久以前，就有位sysop和我说到：”NexusPHP的压力，六成在种子搜索，四成在Tracker“，我记得ta还和我说过：”NexusPHP的torrents表是张很热很热的表“（也可能是另一站的sysop），于是ta把他们站的搜索引擎切换到了[Xunsearch](http://www.xunsearch.com/)上，果然没有再出现过压力过大的问题。

> 对上面两句话我的粗浅认知：
> 1. tracker在每次seeder, leechers, time_completed 变动时都会更新torrents表，更新很频繁
> 1. 种子搜索使用的是 MySQL 的 `LIKE %...%` 语句，特别是关键词多的时候，如搜索 `I Love Flowers` 会被最终拼成 `WHERE (name LIKE "%Love%" or small_descr LIKE "%Love") and (name LIKE "%Flowers%" or small_descr LIKE "%Flowers%")`。但MySQL的该语句不能走索引（走全文索引的是 `MATCH AGAINST`），所以会触发全表扫描

所以我也信了ta的话，在我站频繁出现5xx错误后，我同样把优化的方向改为了 从Mysql的 `LIKE %...%` 语句中切换到更加专业的全文搜索引擎中。结果很顺利，站点又恢复了之前的流畅。

> 注：
>
> 1. 本文不仅仅有全文搜索引擎的替换说明，还涉及对NPHP他那屎山一般的 `torrents.php` 实现进行优化；因此，全部实现示例会拆成多个commit+1个整体pr来尽可能展示本站的更新。
>2. 本文在行文以及对应commit中的实现与OurBits站点的实现并不一致，仅作思路展示。

<!--more-->

# 一、`torrents.php` 文件分析

NPHP的torrents.php大体可以分为两个部分，一部分是解析 `$_GET` 生成对应的SQL语句，另一部分是HTML输出。本次优化的重点在于对`$_GET`的解析部分。例如：

## 1. 对 [inclbookmarked](https://github.com/Rhilip/NexusPHP/blob/346374e9836a049b4d6bbbd21f003560cb64642d/torrents.php#L127-L157), [incldead](https://github.com/Rhilip/NexusPHP/blob/346374e9836a049b4d6bbbd21f003560cb64642d/torrents.php#L164-L192), [spstate](https://github.com/Rhilip/NexusPHP/blob/346374e9836a049b4d6bbbd21f003560cb64642d/torrents.php#L194-L279) 之类的

基本逻辑都是先判断`$_GET`中是否存在，如果不存在则检查用户的 `notifs`，最后对取值做一个判断。

```php
if (isset($_GET["incldead"])) {
    $include_dead = 0 + $_GET["incldead"];
} elseif ($CURUSER['notifs']) {
    if (strpos($CURUSER['notifs'], "[incldead=0]") !== false) {
        $include_dead = 0;
    } elseif (strpos($CURUSER['notifs'], "[incldead=1]") !== false) {
        $include_dead = 1;
    } elseif (strpos($CURUSER['notifs'], "[incldead=2]") !== false) {
        $include_dead = 2;
    } else {
        $include_dead = 1;
    }
} else {
    $include_dead = 1;
}

if (!in_array($include_dead, array(0,1,2))) {
    $include_dead = 0;
    write_log("User " . $CURUSER["username"] . "," . $CURUSER["ip"] . " is hacking incldead field in" . $_SERVER['SCRIPT_NAME'], 'mod');
}
```

所以我们可以很简单的抽象出一个函数来处理这个问题。

```php
/**
 * @param string $field  $_GET的取值
 * @param int $default   默认值
 * @param array|null $allowed_values    允许的范围
 * @param string|null $notifs    如果定义则考虑$CURUSER['notifs']
 * @return int   返回对应的值
 */
function filter_int_input(string $field, int $default = 0, array $allowed_values = null, string $notifs = null): int {
    global $CURUSER;

    $value = filter_input(INPUT_GET, $field, FILTER_VALIDATE_INT);
    if (is_null($value)) {  // field is not exist or is not int
        if ($notifs && !empty($CURUSER['notifs'])) {
            foreach ($allowed_values as $valid_field_id) {
                if (strpos($CURUSER['notifs'], '[' . $notifs . '=' . $valid_field_id . ']') !== false) {
                    $value = $valid_field_id;
                    break;
                }
            }
        }
    }

    if (is_null($value) || $value === false) {  // field value is still not exist
        $value = $default;
    }

    if ($allowed_values && !in_array($value, $allowed_values)) {
        $value = $default;
        write_log("User " . ($CURUSER["username"] ?? $CURUSER['id']) . "," . $CURUSER["ip"] . " is hacking {$field} field", 'mod');
    }

    return $value;
}

$inclbookmarked = filter_int_input('inclbookmarked', 0, [0,1,2], 'inclbookmarked');
$include_dead = filter_int_input('incldead', 1, [0,1,2], 'incldead');
$special_state = filter_int_input('spstate', 0, range(0,7), 'spstate');
$search_mode = filter_int_input('search_mode', 0, [0, 1, 2]);
$search_area = filter_int_input('search_area', 0, [0, 1, 3, 4]);
```

这其中，对于 `spstate` 的后续处理

```php
if ($special_state == 0) {	//all
    $addparam .= "spstate=0&";
} elseif ($special_state == 1) {	//normal
    $addparam .= "spstate=1&";

    $wherea[] = "sp_state = 1";

    if (get_global_sp_state() == 1) {
        $wherea[] = "sp_state = 1";
    }
} elseif ($special_state == 2) {	//free
    $addparam .= "spstate=2&";

    if (get_global_sp_state() == 1) {
        $wherea[] = "sp_state = 2";
    } elseif (get_global_sp_state() == 2) {
        ;
    }
} //......
```

可以进一步简化为下面表述

```php
$addparam .= "spstate=" . $special_state . "&";
if ($special_state != 0 && get_global_sp_state() == 1) {
    $wherea[] = "sp_state = " . $special_state;
}
```


## 2. 对 medium, codec 等和分类有关的

基本结构和上面相同，但与上方不同，应该返回的是一个数组，可以见下方以source为例的实际抽取说明

```php
// LINE https://github.com/Rhilip/NexusPHP/blob/346374e9836a049b4d6bbbd21f003560cb64642d/torrents.php#L10-L21
$showsource = get_searchbox_value($sectiontype, 'showsource'); //whether show sources or not

// LINE https://github.com/Rhilip/NexusPHP/blob/346374e9836a049b4d6bbbd21f003560cb64642d/torrents.php#L23-L46
if ($showsource) {
    $sources = searchbox_item_list("sources");
}

// LINE https://github.com/Rhilip/NexusPHP/blob/346374e9836a049b4d6bbbd21f003560cb64642d/torrents.php#L281-L304
if ($showsubcat) {
    if ($showsource) {
        $source_get = 0 + $_GET["source"];
    }
}

// LINe https://github.com/Rhilip/NexusPHP/blob/346374e9836a049b4d6bbbd21f003560cb64642d/torrents.php#L308-L564
if (!$all) {
    if (!$_GET && $CURUSER['notifs']) {
        if ($showsubcat) {
            if ($showsource) {
                foreach ($sources as $source) {
                    $all &= $source[id];
                    $mystring = $CURUSER['notifs'];
                    $findme  = '[sou'.$source['id'].']';
                    $search = strpos($mystring, $findme);
                    if ($search === false) {
                        $sourcecheck = false;
                    } else {
                        $sourcecheck = true;
                    }

                    if ($sourcecheck) {
                        $wheresourceina[] = $source[id];
                        $addparam .= "source$source[id]=1&";
                    }
                }
            }
        }
    } elseif ($source_get) {
        int_check($source_get, true, true, true);
        $wheresourceina[] = $source_get;
        $addparam .= "source=$source_get&";
    }
}
```

这里这么冗长的问题出在哪里了？出在了NPHP分别使用`&source={{.}}`以及 `&source{{.}}=1` 的两种方式来判断source的取值，其中`&source={{.}}`一般用于直接点击搜索框图标的输出，而 `&source{{.}}=1` 用于搜索框勾选时的输出。在这里我觉得应该对此进行进一步优化，统一使用 `&source[]={{.}}` 的形式，以更好的符合相关RFC，同时也一样抽象出函数统一处理。

```php
function filter_classification_input($field, $field_table, $show_key = null, $notifs = null): array
{
    global $browsecatmode;
    global $CURUSER;

    $input_field_value = [];

    $field_show = $field === 'cat' || get_searchbox_value($browsecatmode, 'show' . $show_key); //whether show or not
    if ($field_show) {
        $field_details = searchbox_item_list($field_table);
        $valid_field_ids = array_column($field_details, 'id');

        $input_field_value = filter_input(INPUT_GET, $field, FILTER_VALIDATE_INT, FILTER_FORCE_ARRAY);
        if (is_null($input_field_value)) {
            $input_field_value = [];
            if ($notifs && !empty($CURUSER['notifs'])) {
                foreach ($valid_field_ids as $valid_field_id) {
                    if (strpos($CURUSER['notifs'], '[' . $notifs . $valid_field_id . ']') !== false) {
                        $input_field_value[] = $valid_field_id;
                    }
                }
            }
        } else {
            $input_field_value = array_values(array_intersect($valid_field_ids, $input_field_value));
        }
    }

    return $input_field_value;
}

$category_get = filter_classification_input('cat', 'categories', 'category', 'cat');
if ($showsubcat) {
    $source_get = filter_classification_input('source', 'sources', 'source', 'sou');
    // ....
}
```

至此，如果不考虑拼接params和SQL语句以及html的form中，那么对于`cat` 和 `subcat` (like `source` et.al)的获取以及正确判断已经完成。而对于这两个的拼接，我们同样可以做类似的处理，并将其过程进一步抽象成一个函数。

```php
if (count($category_get) > 0) {
    $addparam .= implode("&", array_map(function ($x) {
            return "cat[]=" . $x;
        }, $category_get)) . "&";
    $wherea[] = "category IN (" . implode(',', $category_get) . ")";
}
```

注意，此处我们拼 `$wherea`  的使用直接使用 `IN()` ， 因为mysql 会自动帮我们优化只有单元素的情况，所以不用担心 `IN()` 的性能问题。

## 3. 实际结果

考虑到部分中间变量（特别是cat和subcat部分）在后面的html阶段还有使用，我们简单的定义一个字典，并对上面的 `filter_classification_input` 函数稍作改动

```php
$all_classification = [
    'cat' => ['notifs' => 'cat', 'items' => genrelist($sectiontype), 'tk' => 'category', 'lang' => 'text_category']
];
$classification_gets = [];   // 拿来缓存我们实际获取到的cat值

$showsubcat = get_searchbox_value($sectiontype, 'showsubcat');//whether show subcategory (i.e. sources, codecs) or not
if ($showsubcat) {
    if (get_searchbox_value($sectiontype, 'showsource')) {  //whether show sources or not
        $all_classification['source'] = ['notifs' => 'sou', 'items' => searchbox_item_list("sources")];
    }
    if (get_searchbox_value($sectiontype, 'showmedium')) {  //whether show media or not
        $all_classification['medium'] = ['notifs' => 'med', 'items' => searchbox_item_list("media")];
    }
    if (get_searchbox_value($sectiontype, 'showcodec')) {  //whether show codecs or not
        $all_classification['codec'] = ['notifs' => 'cod', 'items' => searchbox_item_list("codecs")];
    }
    if (get_searchbox_value($sectiontype, 'showstandard')) {  //whether show codecs or not
        $all_classification['standard'] = ['notifs' => 'sta', 'items' => searchbox_item_list("standards")];
    }
    if (get_searchbox_value($sectiontype, 'showprocessing')) {  //whether show processings or not
        $all_classification['processing'] = ['notifs' => 'pro', 'items' => searchbox_item_list("processings")];
    }
    if (get_searchbox_value($sectiontype, 'showteam')) {  //whether show team or not
        $all_classification['team'] = ['notifs' => 'tea', 'items' => searchbox_item_list("processings")];
    }
    if (get_searchbox_value($sectiontype, 'showaudiocodec')) {  //whether show team or not
        $all_classification['audiocodecs'] = ['notifs' => 'aud', 'items' => searchbox_item_list("audiocodecs"), 'lang' => 'text_audio_codec'];
    }
}
```

此处还有一些涉及HTML的改动，因为过于简单，本处不再累述，请见对应 [commit](https://github.com/Rhilip/NexusPHP/commit/7251eb8613130e724457062035eac81ab955f2f7)

# 二、全文搜索引擎选择

确定要转了之后，下一步就是选择对应的全文搜索引擎了，以下是一些当初选择时的对比想法：

1. Elasticsearch ：① 从我们的用途来说，仅仅是为了将torrents表的搜索目的给割离出去，Elasticsearch就明显过重；② 默认分词规则不能支持中文，需要额外装分词插件，配置繁琐。
1. Xunsearch：① 之前某站在切换后搜索体验并不好，需要管理员额外添加一些同义词，增加了工作量（但某种程度上说，全文搜索引擎都避免不了这个问题）；②从文档看，感觉设置、添加、更新、修改等操作较为繁琐。
1. Meilisearch：体量刚刚好，自带中文分词，文档相对也友好。本站另一位sysop同样推荐（别的站也有考虑迁移到该全文搜索引擎中）

所以一眼就看中了 Meilisearch 作为站点的全文搜索引擎替代，开箱即用。

> 注意，目前在实际使用过程中发现：
>
> 1. 搜索字段中混杂日文和中文时（特别是中文在前，日文在后），Meilisearch不能正确判断语种，会导致搜索中文会不显示对应document。（相关讨论见 [meilisearch#3508](https://github.com/meilisearch/meilisearch/discussions/3508) ）
> 2. 全文搜索引擎并不像MySQL一样能精准匹配，需要让用户做好心理准备。（但这不是bug！）
> 3. （暂时没有别的。。。。）

# 三、Meilisearch安装及配置

Meilisearch的安装基本参照官网 [Installation](https://docs.meilisearch.com/learn/getting_started/installation.html) 部分即可，基本就2步

```bash
# Install Meilisearch
curl -L https://install.meilisearch.com | sh

mv meilisearch /usr/bin
```

随后我们配置systemd文件 `/etc/systemd/system/meilisearch.service`，示例如下，并把其中的 `YOUR_MASTER_KEY` 换成一个随机的字符串。

```ini
[Unit]
Description=Meilisearch
After=systemd-user-sessions.service

[Service]
Type=simple
ExecStart=/usr/bin/meilisearch --db-path /var/lib/meilisearch/data.ms --http-addr 127.0.0.1:7700 --env production --master-key YOUR_MASTER_KEY

[Install]
WantedBy=default.target
```

PHP侧则在原来的基础上，使用composer一步到位

```bash
composer require meilisearch/meilisearch-php
```

至此，meilisearch的安装和基本配置完成，进入PHP中完成下面步骤。

1. 添加一个单例Class

```php
// classes/Components/Meili.php

<?php

namespace NexusPHP\Components;
use Meilisearch\Client;

class Meili
{
    protected static $_meiliSearch;

    /**
     * @return mixed
     */
    public static function getMeiliSearch()
    {

        global $meilisearch_host, $meilisearch_key;

        if (self::$_meiliSearch === null) {
            self::$_meiliSearch = new Client($meilisearch_host, $meilisearch_key);
        }

        return self::$_meiliSearch;
    }
}
```

2. 编辑设置页面 `settings.php` 及配置文件 `include/config.php`。此处同样不再累述，见具体 [commit](https://github.com/Rhilip/NexusPHP/commit/f258820) 

## 四、迁移torrents表数据

关于Meilisearch的运行模式，我和其他人讨论了一段时间。最后采取的是以Mysql为底库，以触发或者定时的形式同步torrents表到Meilisearch。采取这种方法的主要考虑有以下几点：

1. NPHP对torrents表的更新过于琐碎，散乱在 announce, take{upload, edit}, cron 等多个文件。特别是cron里面依据不同条件对种子可见性等属性进行的更新，此时以Meilisearch作为最终的落脚并不合适。
2. Meilisearch对于文档的更新是以软删除的模式进行的。如果长期保持index的更新，很容易导致对应index占用的空间过大。
3. Meilisearch在升级时，跨版本数据库并不是相互兼容的，需要比较麻烦的 export && import操作。

综上，对同步形式做以下规定：

1. 在种子上传、编辑、删除操作时，由PHP同步将种子信息分发给MySQL和Meilisearch。
2. 对于announce对种子的 `visible`, `times_completed`, `seeders`, `leechers` 等信息的更新，其中 visible 和 times_completed 两个属性交由cron中定期同步，seeders 和 leechers 信息交由 Redis 缓存，由PHP在从Meilisearch读出数据后合并。
3. 对于cron中对种子的属性更新，将原来分散到不同 `Priority Class` 的并归到同一层中，并在该层结束时将MySQL表数据全盘同步给Meilisearch。

此外，由于Meilisearch对于[Filter](https://docs.meilisearch.com/learn/core_concepts/indexes.html#filterable-attributes)和[Sort](https://docs.meilisearch.com/learn/core_concepts/indexes.html#sortable-attributes)需要在index中提前定义，对同步的值做以下考虑：

1. 和关键词有关的值： `$search_keys = ["name", "small_descr"]`。
2. 和筛选（WHERE）有关的值：`$filter_keys = [ "category", "source", "medium", "codec", "standard", "processing", "team", "audiocodec", "sp_state", "id", "size", "comments", "times_completed", "leechers", "seeders", "owner", "url", "added",  "anonymous",   "visible", "banned"]`
3. 和排序（SORT BY）有关的值：`$sort_keys = ["id", "pos_group", "name", "comments", "size", "times_completed", "seeders", "leechers", "owner", "anonymous"]`
4. 其他仅和展示有关的值：`$show_keys = ["info_hash", "promotion_time_type", "promotion_until"]` 

以上4个列表之间互有重复，实际应同步的是 `$copy_keys = array_unique($search_keys + $filter_keys + $sort_keys + $show_keys)`，此处的 `$copy_keys` 相对固定，也可以直接定义而不是用 array_unique生成。

注意此处示例：①不加入 `descr`属性 （也就意味着移除了全文搜索功能），因为将 descr 相比其他字段过多，且在搜索工作中被滥用，列入搜索关键词的话会导致Meilisearch构造的index占用大量空间以及在用户使用搜索功能时，影响搜索结果。②在filter和sort中移除了 `numfiles` 属性（因为没人用）。③对于其他NPHP中torrents表有关的属性（比如某些站点的tag功能，豆瓣链接搜索），sysop应该对应加入。

下面，我们开始定义种子迁移的函数，即对单种进行转换。转换的目的主要是php_mysqli在获取时会将int类型的字段以string形式返回，以及meilisearch对于时间类型，应该是以时间戳形式定义。故对于单种的转换方法如下：

```php
$copy_keys = [
    "id", "name", 'small_descr', "size", "info_hash", "owner", "added",
    "category", "source", "medium", "codec", "standard", "processing", "team", "audiocodec",
    "comments", "times_completed", "leechers", "seeders",
    "url", "visible", "banned", 'anonymous',
    "sp_state", "promotion_time_type", "promotion_until",
];

function convert_torrent_mysql2meili($raw_torrent) {
    global $copy_keys;
    $torrent = [];
    foreach ($copy_keys as $copy_key) {
        if (isset($raw_torrent[$copy_key])) {
            $copy_value = $raw_torrent[$copy_key];

            if (in_array($copy_key, [
                "id", "size", "owner",
                "category", "source", "medium", "codec", "standard", "processing", "team", "audiocodec",
                "comments", "times_completed", "leechers", "seeders",
                "sp_state", "promotion_time_type", "url"
            ])) {  // 转换int类型的值
                $copy_value = (int)$copy_value;
            } elseif (in_array($copy_keys, ["visible", "banned", 'anonymous'])) {
                $copy_value = $copy_value === 'yes' ? 1 : 0;
            } elseif (in_array($copy_key, ['added', 'promotion_until'])) {
                $copy_value = strtotime($copy_value);
                if ($copy_value < 0) {
                    $copy_value = 0;
                }
            } elseif ($copy_key === 'info_hash') {
                $copy_value = bin2hex($copy_value);
            }
            
            if (in_array($copy_key, ['url']) && $copy_value == '') {
                $copy_value = 0;
            }

            $torrent[$copy_key] = $copy_value;
        }
    }
    return $torrent;
}
```

同时，我们定义整体的迁移方法如下：

```php
function full_sync_mysql2meili() {
    global $copy_keys;

    $meilisearch = \NexusPHP\Components\Meili::getMeiliSearch();
    $stats = $meilisearch->stats();

    $should_swap = isset($stats['indexes']['torrents']);
    $add_index = $should_swap ? 'torrents_new' : 'torrents';

    // 保证建立新的index
    if (isset($stats['indexes'][$add_index])) {
        $meilisearch->deleteIndex($add_index);
    }
    $torrent_index = $meilisearch->index($add_index);
    $torrent_index->updateSettings([
        "searchableAttributes" => [
            'name', 'small_descr'
        ],  // 此处将搜索字段限制在 name和small_descr
        "sortableAttributes" => [
            "id", "pos_group", "name", "comments", "size", "times_completed", "seeders", "leechers", "owner", "anonymous"
        ],
        "filterableAttributes" => [
            "id", "size", "owner", "added",
            "category", "source", "medium", "codec", "standard", "processing", "team", "audiocodec",
            "sp_state", "comments", "times_completed", "leechers", "seeders", "url", "anonymous", "visible", "banned"
        ],
        'rankingRules' => [
            "sort",
            "words",
        ],  // 此处修改meilisearch的默认排序规则，以便基本和NPHP原来使用mysql的规则相同
        'pagination' => [
            'maxTotalHits' => 500000
        ]  // 将 maxTotalHits 设置为一个远超过目前种子数的值，以防止meilisearch在搜索时丢失结果
    ]);

    $torrents_count = \NexusPHP\Components\Database::count("torrents");
    for ($offset = 0; $offset < $torrents_count; $offset += 2000) {
        $query = \NexusPHP\Components\Database::query("SELECT `" . implode('`, `', $copy_keys) . "` FROM torrents LIMIT $offset, 2000");

        $torrents = [];
        while ($raw = $query->fetch_assoc()) {
            $torrents[] = convert_torrent_mysql2meili($raw);
        }

        $torrent_index->addDocuments($torrents);
    }

    // 交换新老index，并删除老index
    if ($should_swap) {
        $meilisearch->swapIndexes([['torrents_new', 'torrents']]);
        $meilisearch->deleteIndex('torrents_new');
    }
}
```

那么，对于种子的新增、编辑、删除，我们就可以使用如下代码进行同步

```php
// 新增、编辑
global $copy_keys;

$query = \NexusPHP\Components\Database::one("SELECT `" . implode('`, `',$copy_keys) . "` FROM torrents WHERE id = $id");
$torrent_index =\NexusPHP\Components\Meili::getMeiliSearch()->index('torrents');
$torrent_index->addDocuments(convert_torrent_mysql2meili($query));

// 删除
$meilisearch->index('torrents')->deleteDocument($id);
```

在cron里面，我们也可以用 `full_sync_mysql2meili()` 来进行同步。

以上代码示例见 [commit](https://github.com/Rhilip/NexusPHP/commit/f58e28f)，不再累述。但是还有些问题我们还没解决，即：①如何在meilisearch中搜索，②tracker对T表的中 seeders和leechers值的变更如何更新。 以上两个问题，在下一节搜索部分解决。

# 五、实现在Meilisearch搜索

在meilisearch-php中，我们搜索的方式为

```php
$query = '';
$options = [
    'sort' => [],
    'filter' => [],
];

$torrents_index = \NexusPHP\Components\Meili::getMeiliSearch()->index('torrents');
$search = $torrents_index->search($query, $options)->toArray();
```

自然，我们不再需要原来在mysql中使用的`$wherea`，而需要对`$query` 和`$options`的值进行更新。

同时，由于我们在 convert_torrent_mysql2meili 时，对 `"visible", "banned", 'anonymous', 'added', 'promotion_until'` 进行了转换，所以需要在 `function.php` 对应部分进行修改，以满足需求。此处的修改过多，请见 [commit](https://github.com/Rhilip/NexusPHP/commit/eb7d0cf) 。

但此处获取到的peer信息是不准确的，所以我们还需要对peer信息进行更新。此外此时，返回的是准确的数据库值，我们还需要对搜索结果进行处理，具体见 [commit](https://github.com/Rhilip/NexusPHP/commit/0219030) 。

至此，所有和`torrents.php`有关搜索功能已经完全完成。
