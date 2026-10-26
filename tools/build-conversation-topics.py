"""Build auditable conversation scopes for every published lesson (no AI calls)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# key: (scope, conversational goals, distinctive topic vocabulary, related scopes)
DOMAINS = {
 'greeting': ('问候与礼貌交流', '打招呼；介绍姓名；感谢和道歉；礼貌邀请与告别', '你好|您好|问候|再见|谢谢|道歉|对不起|没关系', ['identity','family','schedule','mood']),
 'identity': ('介绍个人信息', '姓名和称呼；国籍与家乡；初次见面', '名字|叫什么|贵姓|称呼|哪国|哪里人|来自|自我介绍', ['greeting','family','city']),
 'age': ('年龄与生日', '询问年龄；说明生日；比较年龄', '多大|几岁|年龄|生日|出生', ['calendar','family']),
 'family': ('家人、朋友与人际关系', '介绍关系；相处经历；关心与联系', '家人|家庭|父母|爸爸|妈妈|兄弟|姐妹|朋友|同事|友谊|相处', ['identity','mood','leisure']),
 'romance': ('爱情与婚姻', '相识和相处；理解与尊重；婚姻观', '爱情|恋爱|婚姻|结婚|爱人|夫妻|情侣', ['family','mood','opinions']),
 'contact': ('电话与联系方式', '询问号码；确认联系方式；打电话找人', '电话|号码|联系|找谁|通话|打错', ['identity','schedule','telecom']),
 'calendar': ('日期、节日与时间', '日期和星期；生日和纪念日；约定时间', '几月|几号|星期|日期|日历|生日|几点|分钟|小时', ['schedule','culture']),
 'schedule': ('日常作息与时间安排', '起床和上班时间；约时间；比较昨日与明日安排', '起床|作息|安排|有空|什么时候|几点|周末|昨天|明天|每天|时间管理|自律|迟到|忙', ['calendar','work','leisure','future']),
 'learning': ('汉语学习与学习方法', '学习目标；方法与困难；复习与成果', '中文|汉语|学习|学校|考试|复习|作业|老师|听懂|进步|读书|方法', ['clarify','reading','education','future']),
 'clarify': ('听懂、确认与消除误会', '请对方重说；确认理解；解释误会', '再说|重复|听清|听懂|明白|确认|误会|意思|怎么说', ['learning','opinions','teamwork']),
 'location': ('位置与问路', '询问位置；描述方向；确认路线', '在哪|哪儿|哪里|左边|右边|前面|后面|附近|怎么走|问路|路口|地址', ['transport','city']),
 'home': ('住房、房间与居家生活', '房间与家具；租房需求和租金；居住体验', '房间|房子|住房|租房|租金|房租|搬家|家具|卧室|客厅|房东|整齐', ['location','city','repair','budget']),
 'dining': ('餐饮、点菜与烹饪', '菜品和口味；点餐需求；做菜与用餐体验', '吃|菜|饭|餐|口味|辣|甜|咸|厨房|做饭|菜单|结账', ['drinks','shopping','payment','culture']),
 'drinks': ('饮品与饮用偏好', '选择饮品；冷热甜度；数量和杯型', '喝|茶|咖啡|饮料|水|杯|热的|冰的|糖', ['dining','payment']),
 'shopping': ('购物、价格与商品选择', '购买需求；价格和预算；规格、试穿与比较', '买|卖|商品|商店|超市|衣服|价格|多少钱|便宜|贵|打折|尺寸|颜色|质量|试穿|网购', ['payment','returns','budget']),
 'returns': ('退换货与消费者沟通', '说明问题；退换条件；售后解决办法', '退货|换货|退换|退款|售后|维权|收据|发票|商品|客服', ['shopping','payment','delivery']),
 'payment': ('支付、账单与办理业务', '支付方式；扫码与找零；核对金额', '付款|支付|扫码|现金|银行卡|账单|找零|金额|转账', ['shopping','budget','telecom']),
 'budget': ('收入、消费与理财', '收入与支出；预算和储蓄；消费选择', '收入|工资|薪水|薪资|赚钱|挣|赚|存款|理财|生活费|预算|消费|花费|支出|存钱', ['shopping','payment','career']),
 'weather': ('天气、季节与气候', '天气变化；季节偏好；天气影响和准备', '天气|气温|温度|下雨|下雪|晴|阴天|风|季节|春天|夏天|秋天|冬天|冷|热|气候|灾害', ['schedule','travel','environment']),
 'leisure': ('兴趣、休闲与周末活动', '兴趣偏好；活动经历；邀请与安排', '爱好|兴趣|周末|休息|休闲|电影|音乐|玩|活动|散步', ['sports','schedule','art','travel']),
 'sports': ('运动与锻炼', '运动习惯；锻炼安排；运动效果', '运动|锻炼|跑步|游泳|打球|健身|骑车|球', ['health','schedule','leisure']),
 'transport': ('交通、车票与出行规则', '交通方式；路线和车票；出行问题与规则', '车站|地铁|公交|公共汽车|出租车|打车|交通|车票|火车|飞机|机场|坐车|开车|堵车|出行', ['location','schedule','travel','payment']),
 'travel': ('旅行规划与旅途经历', '目的地；行程和预算；困难与文化体验', '旅行|旅游|旅途|行程|景点|风景|目的地|导游|护照|签证|出发', ['transport','hotel','culture','dining','location','budget']),
 'hotel': ('订房与入住', '房型和预订；入住退房；住宿需求', '酒店|宾馆|订房|订一个房间|预订|入住|退房|房型|住宿|前台', ['home','payment','travel']),
 'health': ('健康习惯与就医交流', '不适与症状；就医安排；健康生活', '身体|健康|不舒服|生病|医院|医生|看病|疼|痛|发烧|咳嗽|症状', ['medicine','sports','dining','schedule']),
 'medicine': ('用药与药店沟通', '确认药名和用法；询问注意事项；复述医嘱，不自行诊断开药', '药|服用|用药|剂量|医嘱|药店|过敏', ['health','calendar']),
 'repair': ('维修与服务预约', '描述故障；预约时间；确认处理结果', '坏了|维修|修理|空调|漏水|故障|预约|理发|服务', ['home','schedule','equipment','payment']),
 'delivery': ('快递、收货与物流', '查询进度；确认地址；处理漏件与收货', '快递|包裹|物流|收货|送到|运单|配送', ['location','shopping','returns','contact']),
 'telecom': ('手机与通信业务', '电话卡与套餐；网络问题；办理和续费', '电话卡|套餐|流量|手机卡|网络|话费|办卡|通信', ['contact','payment','technology']),
 'phone': ('电话接听与找人', '接听与自报身份；找人和转接；留言', '电话|找谁|接听|留言|转接|打错|通话', ['contact','identity']),
 'opinions': ('表达意见与协商', '说明看法和理由；礼貌表达不同意见；协商办法', '觉得|认为|意见|看法|合适|建议|同意|不同意|怎么办|求助', ['teamwork','mood']),
 'mood': ('情绪、幸福与成长', '表达感受；应对困难；选择与成长', '心情|感受|幸福|开心|难过|压力|困难|成功|失败|选择|成长|烦恼|美好|美|发现', ['family','future','opinions','leisure']),
 'reading': ('阅读与信息判断', '读书习惯；分享观点；核实信息和判断来源', '书|阅读|读书|信息|新闻|来源|判断|文章', ['learning','technology','opinions']),
 'art': ('文化艺术与审美', '艺术偏好；欣赏体验；比较和表达审美', '艺术|审美|京剧|茶|音乐|绘画|作品|欣赏|美', ['culture','leisure','opinions']),
 'environment': ('自然、环保与绿色生活', '环境问题；生活措施；自然与气候影响', '环境|保护|地球|自然|绿色|垃圾|节约|污染|回收|气候|灾害|动物|植物', ['weather','city','technology']),
 'technology': ('科技、手机与信息生活', '使用场景；便利和问题；人工智能与隐私', '科技|技术|人工智能|智能|手机|网络|社交|媒体|隐私|数据|应用', ['reading','opinions','learning']),
 'culture': ('中越文化、节日与跨文化交流', '介绍文化习俗；比较体验；解释差异', '文化|越南|中国|春节|节日|传统|习俗|做客|饮食|家乡', ['family','dining','travel','art','city']),
 'city': ('城市、家乡与生活环境', '介绍家乡；比较生活条件；推荐地方', '城市|家乡|生活|地方|环境|社区|越南|中国|设施', ['home','location','transport','culture']),
 'education': ('教育与家庭沟通', '学习习惯；教育方式；代际理解和终身学习', '教育|孩子|父母|代际|学习|培养|学校|成长', ['family','learning','opinions']),
 'community': ('志愿服务与社会责任', '志愿经历；社区需求；参与和合作', '志愿|服务|社会|责任|社区|帮助|公益', ['teamwork','city','opinions']),
 'career': ('求职、面试与职业选择', '个人经历；岗位要求；职业目标与待遇', '求职|面试|简历|职业|工作|岗位|经验|应聘|待遇|薪资', ['identity','work','future','budget']),
 'work': ('工作与职场日常', '工作职责；时间安排；沟通和任务进度', '工作|上班|下班|岗位|任务|同事|部门|汇报|职场', ['schedule','teamwork','leave','progress']),
 'leave': ('考勤、请假与调班', '说明请假原因；约定班次；确认考勤', '请假|考勤|调班|加班|迟到|打卡|班次|休假', ['work','schedule','health']),
 'teamwork': ('团队合作与工作沟通', '分工与确认；解决分歧；汇报与改善', '合作|沟通|团队|分工|同事|班组长|工程师|任务|改善|建议', ['work','opinions','progress']),
 'negotiation': ('商业合作与谈判', '合作需求；价格和交期；条件与协议', '商业|谈判|合作|合同|报价|订单|交期|协议|条件', ['budget','progress','shopping']),
 'future': ('未来计划与人生选择', '目标与理由；行动安排；评估选择', '未来|计划|目标|打算|准备|希望|选择', ['schedule','career','learning','mood']),
 'factory': ('工厂报到、部门与厂区', '报到流程；岗位和部门；介绍设施', '工厂|报到|部门|岗位|车间|厂区|设施|工牌', ['work','location','teamwork']),
 'ppe': ('工作服与安全防护', '防护用品；穿戴与检查；安全提醒', '工作服|防护|手套|口罩|安全鞋|穿戴|护目镜', ['safety','factory']),
 'esd': ('无尘车间与静电防护', '进入规范；防静电用品；检查与确认', '无尘|静电|防静电|接地|手环|洁净|灰尘', ['ppe','safety','factory']),
 'instruction': ('车间指令与作业指导', '理解指令；确认步骤；复述要求', '指令|作业|指导书|步骤|操作|要求|确认|工单', ['clarify','factory','assembly','safety']),
 'components': ('电子产品、物料与规格', '识别部件；料号和型号；单位与版本', '电子|产品|零部件|零件|料号|型号|版本|规格|单位|尺寸|数量|电路|电池|主板', ['materials','inspection','factory']),
 'materials': ('物料领取与来料异常', '核对与领取；缺料错料；退回余料', '物料|缺料|错料|来料|余料|领取|退料|料号', ['components','warehouse','progress']),
 'assembly': ('装配与连接工序', '装配步骤；螺丝和连接；确认作业要求', '装配|螺丝|锁付|连接|组装|工序|生产线|工位|工具', ['instruction','components','equipment','inspection']),
 'solder': ('焊接与焊点检查', '描述焊点；确认焊接要求；报告缺陷', '焊接|焊点|虚焊|焊锡|烙铁|连锡', ['inspection','assembly','safety']),
 'equipment': ('设备、工具与故障沟通', '准备和点检；描述异常；报告与请求处理', '设备|工具|故障|异常|机器|报警|停机|点检|换线|换型', ['safety','repair','progress','instruction']),
 'inspection': ('产品质量、检验与返修', '确认检验标准；描述缺陷；反馈和复检', '检验|检查|质量|缺陷|不良|合格|返工|返修|复检|首件|巡检|抽检|测试|外观|功能|良率', ['components','equipment','assembly','progress']),
 'packaging': ('包装、标签与装箱', '核对标签；确认包装；数量和装箱要求', '包装|标签|装箱|箱|条码|封箱', ['warehouse','components','inspection']),
 'warehouse': ('仓储、盘点与出货', '核对库存；盘点差异；安排出货', '仓库|仓储|盘点|库存|出货|入库|发货|数量', ['materials','packaging','progress','delivery']),
 'progress': ('工单、产量与工作汇报', '确认任务；产量和时间；报告进度和困难', '工单|生产|产量|进度|汇报|任务|完成|记录|交期|数量', ['work','teamwork','materials','equipment']),
 'handover': ('交接班与生产记录', '交接状态；核对记录；说明待办', '交接|交班|接班|记录|班次|待办|生产', ['progress','equipment','work']),
 'workplace': ('现场整理与5S', '物品归位；整理清洁；说明改善', '5S|整理|整顿|清洁|清扫|归位|现场|标识', ['factory','safety','teamwork']),
 'safety': ('安全提醒与紧急求助', '说明危险；报告事故；请求人员协助，不指导危险操作', '安全|危险|紧急|求助|事故|受伤|火灾|报警|停机|防护', ['ppe','equipment','health','teamwork']),
}

ASSIGNMENTS = {
 'hsk1-2': 'greeting identity identity age family career contact calendar calendar schedule learning clarify location home dining drinks dining shopping shopping shopping weather leisure sports location transport health work schedule future family'.split(),
 'hsk3': 'identity family learning leisure schedule schedule sports health health health shopping shopping shopping dining dining culture calendar home home city location schedule transport travel hotel travel weather weather education learning clarify learning career work teamwork opinions leave family learning future'.split(),
 'hsk4': 'romance family sports shopping learning shopping health mood mood mood reading mood art environment education mood environment technology dining travel culture city culture culture dining dining home returns budget travel travel career career teamwork factory opinions technology clarify learning future'.split(),
 'hsk5': 'learning schedule career teamwork mood budget returns city health sports family family romance education reading technology technology environment weather travel dining culture art community negotiation inspection transport mood mood future'.split(),
 'daily': 'greeting mood family leisure schedule schedule weather leisure location transport transport transport shopping shopping shopping returns dining drinks dining dining hotel home repair delivery telecom payment health medicine repair phone culture greeting greeting opinions opinions'.split(),
 'electronics': 'factory factory factory leave leave ppe esd instruction clarify components components components materials materials progress instruction equipment assembly assembly solder equipment equipment inspection inspection inspection inspection inspection packaging warehouse progress handover workplace safety teamwork teamwork'.split(),
}

def build():
    manifest = json.loads((ROOT / 'conversation-banks/manifest.json').read_text())
    profiles = []
    for entry in manifest['exercises']:
        match = re.fullmatch(r'(hsk1-2|hsk3|hsk4|hsk5|daily|electronics)-topic-(\d+)', entry['id'])
        if match:
            group, number = match.groups()
            domain = ASSIGNMENTS[group][int(number)-1]
        else:
            domain = {'intro-1':'greeting', 'daily-lesson12-workday':'work', 'factory-3d7a8ec0-f828-4e4c-b02c-d547448a50f8':'equipment'}[entry['id']]
        assert domain in DOMAINS
        profiles.append({'bank':entry['bank'], 'title':entry['title'], 'domain':domain})
    assert len(profiles) == manifest['totalExercises']
    data = {key:{'scope':value[0], 'goals':value[1].split('；'), 'pattern':value[2], 'related':value[3]} for key,value in DOMAINS.items()}
    output = '// Generated by tools/build-conversation-topics.py; edit that source to update scopes.\n'
    output += 'export const topicDomains = '+json.dumps(data, ensure_ascii=False, separators=(',',':'))+';\n'
    output += 'export const lessonTopics = '+json.dumps(profiles, ensure_ascii=False, separators=(',',':'))+';\n'
    (ROOT / 'conversation-topics.mjs').write_text(output)
    print(f'Built {len(profiles)} course scopes across {len(data)} conversation domains.')

if __name__ == '__main__':
    build()
