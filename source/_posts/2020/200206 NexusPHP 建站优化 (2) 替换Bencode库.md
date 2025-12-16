---
title: NexusPHP 建站优化 (2) 替换Bencode库
date: 2020-02-06 04:12:23
categories: PHP
tags: [nexusphp,bencode,composer,rhilip/bencode]
permalink: /archives/1187/
---

我曾在 [PHP 下 Bencode 库差异及性能对比](https://blog.rhilip.info/archives/1064/) 一文中，通过对比指出NPHP在解析多文件(>1k)种子时，因为原解析库的低效率问题，导致性能过差的问题，并给出了相关解决方法。

但是随着**TJUPT代码库变成private状态（示例没了）**，以及 `Rhilip/Bencode` 以基础库形式发布在 `https://packagist.org/` 上并维护。势必有必要重新写一个commit来说明如何替换Bencode库。

以下讲解和代码patch均基于本人fork的官方源码 [Rhilip/NexusPHP](https://github.com/Rhilip/NexusPHP)（v1.5.beta5.20120707），**不提供除本文外的任何形式的说明以及免费讲解**。

具体请见： [Rhilip/NexusPHP#1](https://github.com/Rhilip/NexusPHP/pull/1)

![image-20200206120615167.png](/images/2020/02/4109509822.png)

## `include/benc.php` 调用分析

通过对 NPHP 原使用的`benc.php` 文件中函数调用关系进行分析，我们可以知道在以下文件中调用了NPHP原benc库相关方法并进行替换。

![image-20200206104748443.png](/images/2020/02/1666314807.png)

![image-20200206104819933.png](/images/2020/02/2901836280.png)

## 相关修改步骤

1. 使用Composer进行`rhilip/bencode`库加载（**注意，rhilip/bencode 库要求PHP大于5.6**），并在`include/core.php`中添加autoload。 ([@888b2107](https://github.com/Rhilip/NexusPHP/commit/888b2107e4ff8b134b24aa74aaf73d75e6aca497))

   ```
   composer require rhilip/bencode
   ```

2. 替换一系列和benc相关的文件，涉及列表如下 ([@a24393a2](https://github.com/Rhilip/NexusPHP/commit/a24393a2a69029ac8dc3fbb0f0882c1524170567))

   ![image-20200206115358707.png](/images/2020/02/1773324079.png)

3. 移除原benc文件 ([@c5903c39](https://github.com/Rhilip/NexusPHP/commit/c5903c3923c1c159baaef61bda064e38d77a856d))

