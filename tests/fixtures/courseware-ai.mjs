import fs from 'node:fs';
const deck=JSON.parse(fs.readFileSync(new URL('../../courseware/data/hsk1-2-topic-03.json',import.meta.url)));
export function fixtureParts(){
 const group=i=>{
  const g=structuredClone(deck.groups[i]);g.dialogue=g.dialogue.map((t,n)=>({...t,speaker:n%2?'B':'A'}));g.grammar=g.grammar.map(b=>({...b,items:b.items.slice(0,4)}));return g;
 };
 return {overview:{title:deck.title,difficulty:deck.difficulty,objectives:deck.objectives.slice(0,3),warmup:deck.warmup},group1:group(0),group2:group(1),closing:{practice:deck.practice.map(b=>({...b,items:b.items.slice(0,3)})),communication:{...deck.communication,items:deck.communication.items.slice(0,3)},culture:deck.culture,homework:deck.homework}};
}
