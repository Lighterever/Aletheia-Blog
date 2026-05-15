/**
 * 时间轴数据文件（由 scripts/build-articles.js 自动生成）
 * 请勿手动编辑此文件，在 timeline/ 目录下添加 .md 文件后运行 node scripts/build-articles.js
 */

const timelineData = [
    {
        id: 'lattice-crypto',
        title: '格密码学',
        start: '2026-03-10',
        end: '2026-04-22',
        tags: ["密码学","后量子"],
        entries: [{"date":"2026-03-10","content":"开始看 Regev 的原始论文，LWE 的定义先过了第一遍","isInsight":false},{"date":"2026-03-12","content":"噪声采样的部分卡住了，均匀分布和高斯分布的区别还没搞清","isInsight":false},{"date":"2026-03-18","content":"💡 突然理解了！LWE 的噪声不是\"错误\"，是安全性的来源","isInsight":true},{"date":"2026-03-20","content":"SIS 和 LWE 是双胞问题，对偶关系终于通了","isInsight":false},{"date":"2026-04-22","content":"完结，开始看 Ring-LWE","isInsight":false}]
    },
    {
        id: 'discrete-math',
        title: '离散数学',
        start: '2026-04-11',
        end: null,
        tags: ["数学","离散数学"],
        entries: [{"date":"2026-04-11","content":"开始系统学习离散数学，从集合论基础入手","isInsight":false}]
    },
    {
        id: 'neural-networks',
        title: '神经网络基础',
        start: '2026-05-01',
        end: null,
        tags: ["机器学习","深度学习"],
        entries: [{"date":"2026-05-01","content":"看了吴恩达的课程第一周，关于感知机的内容","isInsight":false},{"date":"2026-05-03","content":"💡 终于理解了激活函数的作用——引入非线性","isInsight":true},{"date":"2026-05-05","content":"开始看反向传播，链式法则卡了一下午","isInsight":false}]
    }
];
