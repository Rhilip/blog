---
title: BYRBT 辅助脚本 · Quote in CKEditor(种子区引用脚本)
date: 2017-07-01 08:42:00
categories:
 - PT
tags: 
 - byrbt
permalink: /archives/521/
---

BYRBT 辅助脚本Bytbt默认的CKEditor编辑器是HTML的，不想其他BBcode的可以直接使用[quote]、[code]或者[mediainfo]标签来加上引用。
于是便有了@cabbage基于原来教程写的[资源简介美化——引用nfo格式](https://bt.byr.cn/forums.php?action=viewtopic&forumid=9&topicid=11235)。
虽然在站内已经有引用脚本的情况下，其实这样也不好用（毕竟还要去找代码，切换编辑器模式）。

一番纠结后，还是选择写一个脚本来实现~

<!-- more -->

Byrbt - Quote in CKEditor
脚本安装地址：[Rhilip/My-Userscript/Byrbt/Byrbt - Quote in CKEditor.user.js](https://github.com/Rhilip/My-Userscript/raw/master/CERNET%20PT%20Extension/Byrbt/Byrbt%20-%20Quote%20in%20CKEditor.user.js) <- 已有Tampermonkey的点击就行

该脚本会为你的CKEditor（就是本站在种子发布以及编辑时候使用HTML编辑器），在插入图片按钮的下方~~其实是添加文字底色的后面~~，添加一个 `</>` 的按钮

![20170701083535f3f2f5415ad7aa9437c06c7e14372742.jpg](/images/2017/2956781840.jpg)

点击新增的按钮，会弹出交互窗口，请按照相关的格式修改

![201707010837359a35711ed5fd9bebb4ac96c841a8e8d9.jpg](/images/2017/2867982792.jpg)


----------
**请注意**

 1. 默认使用的是@DoxHead个人美化版，如需使用其他模板请自己勾选。~~因为我喜欢这个模板~~
 2. 默认勾选了下次引用此种时跳过该引用框（Skip When Next Clone Time），如下次引用时需要使用请取消该复选框。（相关细节参见 [#126610](https://bt.byr.cn/forums.php?action=viewtopic&topicid=11235&page=p126610#pid126610) 、[#126606](https://bt.byr.cn/forums.php?action=viewtopic&topicid=10044&page=p126606#pid126606) ）
 3. 新添引用框加在编辑器已有文字之后。"完全"删除引用框可能需要进入编辑器的代码模式~
 4. 无重大问题（如网页改版等情况），不再对本脚本进行维护。CSS很烂，~~但是就这么滴用着吧~~