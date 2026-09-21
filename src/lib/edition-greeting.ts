export function editionGreeting(hour:number){
 if(hour>=5&&hour<12)return {title:'Good morning. Your paper is here.',body:'Pour a coffee. Take a few minutes for the stories that matter.',drink:'coffee'};
 if(hour>=12&&hour<16)return {title:'A little perspective for your afternoon.',body:'Take a break. Catch up on what is moving across the developer world.',drink:'coffee'};
 if(hour>=16&&hour<20)return {title:'Tea time? Your news is ready.',body:'Put the kettle on. There is a fresh edition to settle into.',drink:'tea'};
 return {title:'Busy day? Here is what happened.',body:'Wind down with the reporting you missed. Your reading desk stays open.',drink:'night'};
}
