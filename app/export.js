// const xlsx = require("node-xlsx");
const data = require("./data");

let typeA = [];
let typeB = [];
let typeC = 0;
data.forEach(p => {
  p.cities.forEach(c => {
    if (p.provinceName.search("湖北省") >= 0) {
      if (c.cityName === "武汉") {
        typeC = c.confirmedCount;
      } else {
        typeB.push({
          name: c.cityName,
          v: c.confirmedCount
        });
      }
    } else {
      typeA.push({
        name: c.cityName,
        v: c.confirmedCount
      });
    }
  });
});

console.log(typeC, typeB, typeA);
typeA = typeA.sort((a, b) => b.v - a.v);
let totalA = 0;
typeA.forEach(v => {
  totalA += v.v;
});

typeB = typeB.sort((a, b) => b.v - a.v);
let totalB = 0;
typeB.forEach(v => {
  totalB += v.v;
});

console.log(
  `A类城市(湖北省以外的城市): 确诊人数每城市平均${Math.round(
    (totalA / typeA.length) * 100
  ) / 100}例, 其中最高为${typeA[0].v}例(${typeA[0].name}市), 最低为${
    typeA[typeA.length - 1].v
  }例(${typeA[typeA.length - 1].name}市)`
);

console.log(
  `B类城市(湖北省以内，除武汉外的城市): 确诊人数每城市平均${Math.round(
    (totalB / typeB.length) * 100
  ) / 100}例, 其中最高为${typeB[0].v}例(${typeB[0].name}市), 最低为${
    typeB[typeB.length - 1].v
  }例(${typeB[typeB.length - 1].name}市)`
);

console.log(`C类城市(武汉市): 确诊人数${typeC}`);
