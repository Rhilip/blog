---
title: R酱的Userscript笔记（2）： 新手入门篇
date: 2018-05-26 15:17:00
categories: userscript
tags: [userscript,ecmascript6]
permalink: /archives/903/
---

在上一篇中，我简单的介绍了一下什么是Userscript，以及怎么使用Userscript。那么，在这篇中，我们就要开始编写我们的第一个脚本了。

# 第一个脚本

## 模板样例（ES5）

在Tampermonkey的管理面板（配置页），点击已安装脚本左边的加号按钮，就会新建一个默认的空用户脚本模板如下：

```javascript
// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
})();
```

可以看到，整个模板分为两部分：

- 第一部分是由`// ==UserScript==`与`// ==/UserScript==`之间的metadata信息区，用来对脚本进行描述说明。格式应该使用以下形式说明。

  ```javascript
  // ==UserScript==
  // @key value
  // ==/UserScript==
  ```
  更具体地说明我会在之后进行说明，当然你也可以在脚本平台进行查阅

- 第二部分则是剩下的代码区，是用户脚本运行时的脚本。所有的代码就应该写在这里。



## Hello World

那么下面就使用alert方法在进入百度页面的时候提示hello world对话框吧。将上面的示例代码改为如下，并**保存**。

```javascript
// ==UserScript==
// @name         Alert Hello World in Baidu
// @namespace    Rhilip
// @version      0.1
// @description  Alert Hello World in Baidu
// @author       Rhilip
// @match        https*://www.baidu.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    alert("hello world~");
})();
```

可以看到我们在meta部分修改了以下选项：

- `name`： 脚本的名称
- `namespace`： 脚本命名空间，如果不知道什么是命名空间可以稍微搜索一下。实际可以看成与`name`字段联合确定一个独立脚本的东西。
- `description`： 脚本功能描述，用来说明脚本的具体用途
- `author`： 脚本作者，你自己
- `match`： 脚本匹配网站（等下再讲）

并在脚本代码区添加了一条`alert("hello world~");`，于是在访问`www.baidu.com`域名下的网站时。这个页面将会像平时一样显示出来，还会弹出一个对话框：“Hello world~”

![TIM截图20180526223816.jpg](/images/2018/05/1387371829.jpg)

当然这个简单的脚本中还隐藏了一些知识，如果你的JavaScript基础还不是很好，可以先略过这部分。直接进入下一部分~

脚本使用`(function() {})()`封装了一个立刻执行的匿名函数，这样可以防止污染页面原有脚本当然，如果你不自己封装也不用担心，现在的脚本平台均会在幕后做了很多的事情来确保用户脚本不会与页面所包含的原有脚本发生严重的冲突，其使用原理也是这种方法。

当然，但这样也导致了一些其他调试上面的问题。比如在用户脚本里定义的变量和函数*不*能被别的脚本访问。事实上，只要用户脚本运行完了，所有的变量和函数就都不能使用了。 这样你直接使用开发者工具的Console面板就不能获得脚本中的变量以及函数。

下面列出了最终Tampermonkey注入`www.baidu.com`页面的JavaScript片段**（经过格式化后），**这个信息你可以在Developer tools - Sources - top - Tampermonkey中找到（，如果没有的话，请保证开发者面板开启的情况下刷新页面查看）。

```javascript
(function() {
    (function(context, fapply, console) {
        with (context) {
            (function(module) {
                "use strict";
                try {
                    fapply(module, context, [, , context.CDATA, context.uneval, context.define, context.module, context.exports, context.GM, context.GM_info]);
                } catch (e) {
                    if (e.message && e.stack) {
                        console.error("ERROR: Execution of script 'Alert Hello World in Baidu' failed! " + e.message);
                        console.log(e.stack.replace(/(\\(eval at )?<anonymous>[: ]?)|([\s.]*at Object.tms_[\s\S.]*)/g, ""));
                    } else {
                        console.error(e);
                    }
                }
            }
            )(function(context, fapply, CDATA, uneval, define, module, exports, GM, GM_info) {

                // ==UserScript==
                // @name         Alert Hello World in Baidu
                // @namespace    Rhilip
                // @version      0.1
                // @description  Alert Hello World in Baidu
                // @author       Rhilip
                // @match        https*://www.baidu.com/*
                // @grant        none
                // ==/UserScript==

                (function() {
                    'use strict';

                    alert("hello world~");
                })();
            })
        }
    })(this.context, this.fapply, this.console);
}).apply(window["__u__16777552.02102864_"])

```

##其他模板样例 

Tampermonkey为开发者还提供了一些其他的模板。比如ECMAScript6、CoffeeScript。分别如下：

- ECMAScript6 ，使用babel和polyfill为浏览器提供ES6支持

```javascript
// ==UserScript==
// @name         New ES6-Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  shows how to use babel compiler
// @author       You
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.18.2/babel.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.16.0/polyfill.js
// @match        <$URL$>
// ==/UserScript==

var inline_src = (<><![CDATA[

    // Your code here...

]]></>).toString();
var c = Babel.transform(inline_src, { presets: [ "es2015", "es2016" ] });
eval(c.code);
```

随着浏览器对ES6规范的支持不断增强，你可以不用使用ECMAScript6 的模板而是直接使用ES5的。

- CoffeeScript，使用CoffeeScript转换器为这种`方言`提供浏览器适配

```coffeescript
// ==UserScript==
// @name         New Coffee-Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  shows how to use coffeescript compiler
// @author       You
// @require      http://coffeescript.org/browser-compiler/coffeescript.js
// @match        <$URL$>
// ==/UserScript==

var inline_src = (<><![CDATA[

    // Your code here

]]></>).toString();
var compiled = this.CoffeeScript.compile(inline_src);
eval(compiled);
```


# 补一些基础知识

Userscript实际是JavaScript。并很考验脚本编写者HTML、CSS、**JavaScript**的综合能力。

以下为一些网站，你可以作为基础学习，也可以作为手册翻阅。

- 菜鸟教程 - 学的不仅是技术，更是梦想！ ：https://www.runoob.com

- w3school 在线教程（中文）： http://www.w3school.com.cn
- W3Schools Online Web Tutorials（英文）： https://www.w3schools.com
- **Web 技术文档 | MDN**： https://developer.mozilla.org/zh-CN/docs/Web  <- 推荐

当然随着ES6规范被浏览器不断支持，你可以开始了解下ES6的一些语法特性：

- ECMAScript 6入门 ： http://es6.ruanyifeng.com
- Can I use... Support tables for HTML5, CSS3, etc ： https://caniuse.com    <- 检查浏览器支持情况