---
title: 使用git-chglog规范commit信息
date: 2019-06-05 13:01:00
categories: knowledge
tags: [git,git-chglog,emoji,git commit,changelog]
permalink: /archives/1078/
---

一个很好的git commit历史很容易帮助自己在code review的时候知道自己做了什么修改。在一段时间之前，我很喜欢使用以下格式，即一个emoji表情加一段文字说明。

```
:bug: Fix torrent link return miss....
```

> 摘自： <https://github.com/Rhilip/Pt-Autoseed/commit/e776a9c19788d022e2d095fbebafe7705d154ca4>

通过emoji表情，可以快速的定位到主要修改的作用，而文字也起到补充作用说明了。例如上面的例子就是一个bug fix，修复了链接丢失的情况。

详细的emoji表情列表可以参考以下两个网站：

- git commit message emoji 使用指南： <https://github.com/liuchengxu/git-commit-emoji-cn>
- gitmoji | An emoji guide for your commit messages： <https://gitmoji.carloscuesta.me/>

而随着我开始写RidPT这个系统性的大工程时，以及当我需要自动化的生成`CHANGELOG.md`的时候，纯粹的emoji表情+文字说明变得不够方便。于是，我将目标瞄向了根据git commit log自动生成CHANGELOG的工具上，于是发现了这个 `git-chglog`。

## 安装 `git-chglog`

>  git-chglog: <https://github.com/git-chglog/git-chglog>

作为使用go编写的跨平台工具，git-chglog的安装十分方便，只需要下载编译好的二进制文件，并将其放到`$PATH`中即可。

本人最近使用`scoop`作为Windows平台下软件包的管理工具。在本处介绍下scoop的安装方法。也十分简单。。。。装完scoop之后直接使用`scoop install git-chglog`即可，且会自动将其放入`$PATH`而不需要手动添加，过程如下：

![TIM截图20190605193757.png](/images/2019/06/2787229408.png)

## `git-chglog`使用

在食用前请看下大神写的 commit message介绍：  <https://github.com/pvdlg/conventional-commit-types> 
，以对于commit格式有所了解。
在git仓库中使用`git-chglog --init`即可进入该软件的交互创建过程。这里我以`ronggang/PT-Plugin-Plus`为示例：

![TIM截图20190605194828.png](/images/2019/06/585497538.png)

分别问了以下几个问题：

- 仓库地址 （What is the URL of your repository?）： 直接回车就行，软件会读`.git`目录下配置信息

- 喜欢的样式（What is your favorite style?）： 有`github, gitlab, bitbucket, none` 四种类型，一般根据你仓库托管的选就行。

- Commit样式（Choose the format of your favorite commit message）：同样有多个选项，对信息提取的完备性依次下降。

```
<type>(<scope>): <subject> -- feat(core): Add new feature
<type>: <subject>          -- feat: Add new feature
<<type> subject>           -- Add new feature
<subject>                  -- Add new feature (Not detect `type` field)
```

- 生成`CHANGLOG.md`的样式（What is your favorite template style?）： 提供三个选项 `keep-a-changelog, standard, cool`，以及参考示例。我观察了很久没发现大的区别，主要是commit的时间的位置以及样式不同。
- Merge是否显示（Do you include Merge Commit in CHANGELOG?）： 根据需求选择y/n
- Revert是否显示（Do you include Revert Commit in CHANGELOG?）： 根据需求选择y/n
- 配置`.chglog`目录（In which directory do you output configuration files and templates?）：默认即可，如果已经有重复文件存在会提示是否需要覆盖。

完成问题的回答之后，就可以使用`git-chglog`自动生成了。

如果并不带任何附加的话，默认是输出到stdout的，需要使用 `git-chglog --output CHANGELOG.md` 才能生成文件形式放在仓库根目录下。

## PhpStorm中使用插件生成格式化commit信息

我们可以很简便的使用IDE的插件来生成格式化的commit信息，如我在PhpStorm中就使用`Git Commit Template`这款插件进行commit信息生成

![TIM截图20190605205014.png](/images/2019/06/156858303.png)

在每个对话框中输入信息后就可以点击`OK`键，格式化的commit信息就自动的放入了`Commit Message`中。其生成的格式如下：

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

## 使用git hook在提交commit的时候更新`CHANGELOG.md`

但是每次都需要键入`git-chglog`的形式生成`CHANGELOG.md`过于麻烦，我们可以使用git hook的形式，用钩子在我们commit之前进行`CHANGELOG.md`的更新。

创建 `/.git/hooks/pre-commit`文件，内容如下

```bash
#!/bin/sh
git-chglog -output CHANGELOG.md
exit 0;
```

这样，`CHANGELOG.md`的自动更新就不用我们去手动管理了。