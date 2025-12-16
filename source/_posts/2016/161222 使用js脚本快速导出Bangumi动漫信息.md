---
title: 使用js脚本快速导出Bangumi动漫信息
date: 2016-12-22 21:22:00
categories:
 - [Coding, Javascript, UserScript]
tags: 
 - Tampermonkey
 - jQuery
 - bamgumi
permalink: /archives/303/
---

这是我最近动手写的唯一一个脚本QAQ
之前想好的把以前写的Byrbt MOD Help脚本拆分大改的想法(坑)，到现在还没有填的打算（~~~人家太忙了啦，舰R开活动又要准备考试~~~）

----------

因为最近Github的仓库在修改，所以这个脚本的代码公开在了Greakfork上

脚本安装地址：
- Bangumi 开发者平台： [https://bgm.tv/dev/app/103](https://bgm.tv/dev/app/103)
- Greakfork [https://greasyfork.org/zh-CN/scripts/25925-bangumi-info-export](https://greasyfork.org/zh-CN/scripts/25925-bangumi-info-export)

安装好后会在动漫栏后面添加一个按钮“导出Bamgumi简介”  （我觉得放在那里挺美观的QAQ

![201612221256075031e5864956a3d47ece7f6a3b5bf924.jpg](/images/2016/19247869.jpg)

点击按钮，弹出输出文本框。（默认情况下输出BBcode格式的简介）
然后复制粘贴即可。

![20161222125635845dfff50ed5c22c09d76054e97656de.jpg](/images/2016/1181830953.jpg)

![2016122217411798238774b3c9645660b1ebe0110b4eac.jpg](/images/2016/3133549679.jpg)

上面就是我预设出来的BBcode|HTML输出格式了~

<!-- more -->

----------

输出的格式也可以在脚本中做修改，我在脚本最开始的部分放置了脚本的控制选项(下面显示的是v20161222的控制选项，如果后面版本更新可能会有不同)

```
////////////////////////////////////////////////////////////////
// 以下为自定义输出参数，请按照说明修改
const STAFFSTART = 4; // 读取Staff栏的起始位置（假定bgm的顺序为中文名、话数、放送开始、放送星期... ，staff从第四个 导演 起算）；初始值为 4
const STAFFNUMBER = 9; // 读取Staff栏数目；初始9，可加大，溢出时按最大可能的staff数读取，如需读取全部请设置值为 Number.MAX_VALUE (或一个你觉得可能最大的值 eg.20)
const MENU = ["STORY : ","STAFF : ","CAST : "]; //输出Menu控制(大小写？)
const UBB = { // !--预设BBCode生成样式
 before : "[b]", // before &amp;&amp; after 放在 MENU字段 前后
 after : "[/b]", // 请保证before after 自闭合
 linedivision : "\n", //行间分割控制
 sectiondivision :"\n\n" //段间分割控制
};
const HTML = { // !--预设Html生成样式
 before: "&lt;font color=\"#008080\" face=\"Impact\" size=\"5\" style=\"margin: 0px; padding: 0px; word-wrap: break-word;\"&gt;",
 after : '&lt;/font&gt;',
 linedivision :"&lt;br&gt;",
 sectiondivision :"&lt;br&gt;&lt;br&gt;"
};
const OUTFORMAT = "UBB"; //默认输出格式（在不点击输出格式的情况下）；初始UBB，可选 "HTML" "NONE"(不自动生成，点击输出)
////////////////////////////////////////////////////////////////
```

嗯，说下各个取值吧：
STAFFSTART：读取Staff栏的起始位置，我的建议是取4，这样刚好从左侧“导演”处开始往下取；但是Bgm也有部分番（多存在于较老的番中）的信息开头不是以“中文名-话数-放送开始-放送星期-导演...”的顺序，而是前段缺少部分信息，那么建议取小，如果不放心可以取0，待输出后再做删减。。
STAFFNUMBER：读取Staff栏数目；初始9，可加大，溢出时按最大可能的staff数读取，如需读取全部请设置值为 Number.MAX_VALUE (或一个你觉得可能最大的值 eg.20)

接下去MENU、UBB、HTML就是控制输出内容的设置了。
MENU：就是控制列头是怎么显示的，为了照顾类如【STORY】、STORY ： 这样不同的格式而设置。修改时必须保证Story、Staff、Cast的顺序不变。
UBB、HTML分别控制输出时的内容附加块，这里拿ubb生成的代码举例（通过前面获取的staff、cast数据分别存放在raw_staff、raw_cast数组中）

```javascript
var outubb = //img + UBB.sectiondivision +
 UBB.before + MENU[0] + UBB.after + UBB.linedivision +
 story + UBB.sectiondivision +
 UBB.before + MENU[1] + UBB.after + UBB.linedivision +
 raw_staff.join(UBB.linedivision) + UBB.sectiondivision +
 UBB.before + MENU[2] + UBB.after + UBB.linedivision +
 raw_cast.join(UBB.linedivision) + UBB.sectiondivision +
 "(来源于" + base_link +")" + UBB.linedivision;
```

第1行：生成图像url（不建议食用，默认已注释。因为bgm的图片质量太低了）
第2、3行：生成story部分。这里应注意before和after部分的要能闭合，例如：UBB.before="[b][size=5]"，那么UBB.after应为"[/size][/b]"而不是"[/b][/size]"；最后用linedivision和sectiondivision分割行与段。
第4-7行：分别生成staff和cast部分。使用Array.join()函数拼接数组形成字符串。

嗯，说下想写这个脚本的意图吧，用Bangumi也有一段时间了。在各个打酱油的教育网PT站也发了些动漫种子，最开始其简介部分直接复制bgm上的，带了很多不必要的html和css代码，也显得很难看。（~~~不过都有一键引用的功能，直接引用发布是种不错的选择~~~）
然后馁，昨天晚上(2016.12.21)空了一下。闲着无事遍突然想要填这个坑了。。

----------

这次码代码，第一次使用了jQuery.SimpleModal插件来方便生成模态窗口
（一开始是想要改写Bgm默认的“修改收藏”窗口的，但是后来发现这样会导致用户无法使用该窗口，放弃~
然后想要使用bgm原生的TB方法（见http://bgm.tv/min/g=js） 来实现，重构到该脚本太麻烦，卒
然后百度搜索可以使用的js or jq方法，嗯，也是重现起来麻烦。。）

jQuery.SimpleModal插件有关网址：
jQuery官网：[https://plugins.jquery.com/simplemodal/](https://plugins.jquery.com/simplemodal/)
演示dome：[http://simplemodal.plasm.it/](http://simplemodal.plasm.it/)

----------

之后可能会考虑把几个有关的控制选项提到前端吧，不过这个坑什么时候能填上那？

----------

> 2018.03.06 更

突然想起了本人还有这样一个脚本。自2016年开始写Userscript以来进步不少。这次 [20180305](https://github.com/Rhilip/PT-help/commit/edb8ebbc011c33c53147127dcdefbd941e589485) 修改中，移除了jQuery.SimpoleModal插件，并使用了Bangumi自带的tb_init()来生成模态窗口。也算是填完了一个遗留的坑吧。

> 2018.03.15 更

脚本于2018.03.08提交Bangumi开发者平台，并于今日通过审核，你可以直接在组件中启用而不需要额外安装。但是请注意，使用Bangumi组件暂时不能对输出参数进行修改。