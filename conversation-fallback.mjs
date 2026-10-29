import {topicProfile,topicViolation} from './conversation-topic.mjs';
// Used only when live generation cannot supply a new in-scope question.
const questions={
 greeting:[['你想怎么称呼我？','Nǐ xiǎng zěnme chēnghu wǒ?'],['很高兴认识你。你想认识我的朋友吗？','Hěn gāoxìng rènshi nǐ. Nǐ xiǎng rènshi wǒ de péngyou ma?'],['我可以明天再来找你吗？','Wǒ kěyǐ míngtiān zài lái zhǎo nǐ ma?'],['谢谢你陪我聊天。明天见，好吗？','Xièxie nǐ péi wǒ liáotiān. Míngtiān jiàn, hǎo ma?']],
 schedule:[['你出门前要做什么？','Nǐ chūmén qián yào zuò shénme?'],['你回家以后想做什么？','Nǐ huí jiā yǐhòu xiǎng zuò shénme?'],['你今天什么时候有空？','Nǐ jīntiān shénme shíhou yǒu kòng?'],['这件事要多长时间？','Zhè jiàn shì yào duō cháng shíjiān?']],
 calendar:[['我们约在星期几见面？','Wǒmen yuē zài xīngqī jǐ jiànmiàn?'],['你想上午见面还是下午见面？','Nǐ xiǎng shàngwǔ jiànmiàn háishi xiàwǔ jiànmiàn?'],['你想几点回家？','Nǐ xiǎng jǐ diǎn huí jiā?']],
 education:[['你在学校最喜欢做什么？','Nǐ zài xuéxiào zuì xǐhuan zuò shénme?'],['你今天想和同学一起做什么？','Nǐ jīntiān xiǎng hé tóngxué yìqǐ zuò shénme?'],['你下课后去哪里？','Nǐ xiàkè hòu qù nǎlǐ?']],
 identity:[['你希望我怎么称呼你？','Nǐ xīwàng wǒ zěnme chēnghu nǐ?'],['你的家乡有什么特别的地方？','Nǐ de jiāxiāng yǒu shénme tèbié de dìfang?'],['你想了解我什么？','Nǐ xiǎng liǎojiě wǒ shénme?']],
 dining:[['你还想加一道菜吗？','Nǐ hái xiǎng jiā yí dào cài ma?'],['你想要辣的还是不辣的？','Nǐ xiǎng yào là de háishi bú là de?'],['我们一起吃，可以吗？','Wǒmen yìqǐ chī, kěyǐ ma?']],
 shopping:[['你想试一下吗？','Nǐ xiǎng shì yíxià ma?'],['你想买几个？','Nǐ xiǎng mǎi jǐ ge?'],['你还需要别的吗？','Nǐ hái xūyào bié de ma?']],
 mood:[['你想和谁分享这件事？','Nǐ xiǎng hé shéi fēnxiǎng zhè jiàn shì?'],['你想让我陪你聊一会儿吗？','Nǐ xiǎng ràng wǒ péi nǐ liáo yíhuìr ma?'],['现在有什么能让你开心一点？','Xiànzài yǒu shénme néng ràng nǐ kāixīn yìdiǎn?']]
};
const followups=[
 ['关于刚才说的事，你还想告诉我什么？','Guānyú gāngcái shuō de shì, nǐ hái xiǎng gàosu wǒ shénme?'],
 ['你想问我什么？','Nǐ xiǎng wèn wǒ shénme?'],
 ['这件事，你想和谁一起做？','Zhè jiàn shì, nǐ xiǎng hé shéi yìqǐ zuò?'],
 ['你想先做哪一件事？','Nǐ xiǎng xiān zuò nǎ yí jiàn shì?'],
 ['你觉得这样方便吗？','Nǐ juéde zhèyàng fāngbiàn ma?'],
 ['你还需要我帮什么忙？','Nǐ hái xūyào wǒ bāng shénme máng?'],
 ['你想试试别的方法吗？','Nǐ xiǎng shìshi bié de fāngfǎ ma?'],
 ['你想再和我聊一会儿吗？','Nǐ xiǎng zài hé wǒ liáo yíhuìr ma?']
];
export function fallbackQuestion(lesson,messages,action='answer'){
 const domain=topicProfile(lesson).domain;
 const candidates=[...(questions[domain]||[]),...(action==='open'?[]:followups)];
 const item=candidates.find(([question])=>!topicViolation(question,lesson,messages));
 return item?{next:item[0],nextPinyin:item[1],nextKeywords:[]}:null;
}
