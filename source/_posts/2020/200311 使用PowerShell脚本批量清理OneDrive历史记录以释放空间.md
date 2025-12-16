---
title: 使用PowerShell脚本批量清理OneDrive历史记录以释放空间
date: 2020-03-11 14:50:00
categories: knowledge
tags: [rclone,onedrive,powershell,sharepoint]
permalink: /archives/1215/
---

由于Rclone在复制/移动文件到OneDrive过程中存在一些问题（特别是一些比较老的Rclone版本），容易导致部分文件出现大量历史记录。因为OneDrive对于历史记录同样计算占用空间，用户侧无法禁用该feature，所以产生了大量浪费。

![image-20200311220632223.png](/images/2020/03/957893561.png)

> 对 `rclone size One: --json` 的结果进行检查，如果 `total - used - free - trashed` 所得结果超过约 1710000 （应该是SharePoint保留空间） 的部分则基本可以代表历史记录所占空间

但Rclone不支持相关操作，且OneDrive历史记录在网页上处理相当麻烦（需要在 Site settings - Storage Metrics中对一个个文件的历史记录进行处理），在文件数众多的情况下难以有效处理。故很久之前，面对历史记录，我一般就直接放置处理（然后换用一个OD帐号）。

然而在开始使用Microsoft Graph API对OneDrive进行操作时，我就开始有意识的找一些脚本，然而很有意思的是，Graph API在目前无法对DriveItemVersion类型资源进行删除处理，此外也没有对OneDrive回收站以及二层回收站进行删除处理的相关方法。

![image-20200311220214195.png](/images/2020/03/4031256548.png)

皇天不负有心人，我终于找到一篇文章 [Delete old document versions from OneDrive for Business | I learned it. I share it.](https://gyorgybalassy.wordpress.com/2018/11/11/delete-old-document-versions-from-sharepoint-onedrive/) ，它介绍了通过SharePoint形式，对OneDrive进行操作的方式，并提供了两个PowerShell脚本和一个该文作者的C#项目 https://github.com/balassy/OneDriveVersionCleaner。

结果一开始我使用PowerShell脚本时，就出现如上文中一样的因为文件数过多的错误，在尝试`balassy/OneDriveVersionCleaner` 时，又因为该项目不支持Recursive，而且我对PowerShell以及C#不熟悉便草草放弃了折腾。

今天晚上忙里偷闲，翻看了了其上面两个脚本以及C#项目的实现，发现对Powershell脚本稍作修改便可以正常使用。并将其上传至GitHub上分享：

> 项目地址 ： https://github.com/Rhilip/OneDrive_VersionHistoryCleaner

<!--more-->

## 食用方法

1. 下载整个项目，项目中带有提取使用的两个动态链接库 `Microsoft.SharePoint.Client.dll` 以及 `Microsoft.SharePoint.Client.Runtime.dll` ，你也可以参照原PowerShell脚本指引，下载并安装 [ SharePoint Online SDK ](http://www.microsoft.com/en-us/download/details.aspx?id=42038)。

2. 编辑 `DeleteFileVersions.ps1` 中最后几行（`$Url, $username, $AdminPassword`）至自己OneDrive对应项。而`$ListTitle` 项为其实搜索目录，一般情况下为 `Documents`或者 `文档`，如果搜索某一子目录，应修改为 `Documents/subfolder`样式。

   ```powershell
   #Paths to SDK
   Add-Type -Path ".\Lib\Microsoft.SharePoint.Client.dll"
   Add-Type -Path ".\Lib\Microsoft.SharePoint.Client.Runtime.dll"
   
   #Enter the data
   $Url = "https://TODO-my.sharepoint.com/personal/TODO_SITE_NAME"
   
   $username = "TODO_USERNAME"
   $AdminPassword = ConvertTo-SecureString -String "TODO_PASSWORD" -AsPlainText -Force
   #$AdminPassword=Read-Host -Prompt "Enter password" -AsSecureString
   
   #$ListTitle = "文档"
   $ListTitle="Documents"
   ```

3. 直接运行该Powershell脚本即可，你可以看到如下输出，其中第一行报错为处理目录时报错，可以不用管。脚本会遍历`$ListTitle`下所有文件，并自动删除多余的历史记录。
   
   ![image-20200311224218373.png](/images/2020/03/1559974782.png)

## 脚本修改

对原PowerShell脚本中使用的ViewXml，增加RowLimit限制，防止其超出Microsoft侧的硬限制。并使用do-while循环，对CAMLQuery附加`ListItemCollectionPosition`属性使其支持翻页。

具体diff请看 ： https://www.diffchecker.com/UjI8kqJI
