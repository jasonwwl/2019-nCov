const request = require("request-promise-native");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const moment = require("moment");

const dburi = process.env.MONGO_URL;

mongoose.connect(dburi, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});

const StatArea = mongoose.model("stat_area", {
  city_name: String,
  confirmed: Number,
  suspected: Number,
  cured: Number,
  dead: Number,
  province_name: String,
  province_sortname: String,
  province_confirmed: Number,
  province_suspected: Number,
  province_cured: Number,
  province_dead: Number,
  last_modified: Date,
  single_city: Boolean,
  counter: Number
});

const StatAreaCounter = mongoose.model("stat_area_counter", {
  count: Number,
  updated_at: Date
});

const Topic = mongoose.model("topic", {
  updated_at: Date,
  data: { type: Object }
});

const Timeline = mongoose.model("timeline", {
  id: Number,
  pub_date: Date,
  pub_date_str: String,
  title: String,
  summary: String,
  info_source: String,
  source_url: String,
  province_name: String,
  created_time: Date,
  modify_time: Date
});

async function getData(times) {
  let sourceData = null;
  if (times > 0) {
    console.log(`[sync-request] retry ${times}...`);
  }
  if (times >= 20) {
    throw new Error("get dxy.cn data error");
  }
  try {
    sourceData = await request({
      method: "GET",
      timeout: 1500,
      uri: "https://3g.dxy.cn/newh5/view/pneumonia"
    });
  } catch (e) {
    console.log(e.message);
    sourceData = await getData((times || 0) + 1);
  }
  return sourceData;
}

async function exec() {
  console.log(
    `[sync] task begin at ${moment().format("YYYY-MM-DD HH:mm:ss.SSS")}`
  );
  const beginTimer = new Date();
  console.log("[sync] get dxy.cn data");
  const sourceData = await getData(0);
  const $ = cheerio.load(sourceData);
  let getAreaStat = [];
  eval(
    $("#getAreaStat")
      .html()
      .replace("window.getAreaStat", "getAreaStat")
  );
  let getStatisticsService = {};
  eval(
    $("#getStatisticsService")
      .html()
      .replace("window.getStatisticsService", "getStatisticsService")
  );
  let getTimelineService = [];
  eval(
    $("#getTimelineService")
      .html()
      .replace("window.getTimelineService", "getTimelineService")
  );
  const nowtime = new Date();
  const statAreaData = [];
  getAreaStat.forEach(p => {
    p.cities = p.cities || [];
    p.cities.forEach(c => {
      statAreaData.push({
        city_name: c.cityName,
        confirmed: c.confirmedCount,
        suspected: c.suspectedCount,
        cured: c.curedCount,
        dead: c.deadCount,
        province_name: p.provinceName,
        province_sortname: p.provinceShortName,
        province_confirmed: p.confirmedCount,
        province_suspected: p.suspectedCount,
        province_cured: p.curedCount,
        province_dead: p.deadCount,
        last_modified: nowtime,
        single_city: false
      });
    });
    if (p.cities.length < 1) {
      statAreaData.push({
        city_name: p.provinceName,
        confirmed: p.confirmedCount,
        suspected: p.suspectedCount,
        cured: p.curedCount,
        dead: p.deadCount,
        province_name: p.provinceName,
        province_sortname: p.provinceShortName,
        province_confirmed: p.confirmedCount,
        province_suspected: p.suspectedCount,
        province_cured: p.curedCount,
        province_dead: p.deadCount,
        last_modified: nowtime,
        single_city: true
      });
    }
  });
  const counter = await StatAreaCounter.findOneAndUpdate(
    {},
    {
      $set: {
        updated_at: nowtime
      },
      $inc: {
        count: 1
      }
    },
    {
      upsert: true,
      new: true
    }
  );
  console.log(`[sync-area-stat] begin at loop#${counter.count}`);
  await StatArea.insertMany(
    statAreaData.map(v => {
      v.counter = counter.count;
      return v;
    })
  );
  console.log("[sync-area-stat] ended");
  console.log("[sync-topic] begin");
  await Topic.findOneAndUpdate(
    {
      updated_at: moment(getStatisticsService.modifyTime).toDate()
    },
    {
      $set: {
        data: getStatisticsService
      }
    },
    {
      upsert: true
    }
  );
  console.log("[sync-topic] ended");
  console.log("[sync-timeline] begin");
  let i = 0;
  for (let item of getTimelineService) {
    i += 1;
    console.log(
      `[sync-timeline] #${item.id} (${i}/${getTimelineService.length})`
    );
    await Timeline.findOneAndUpdate(
      {
        id: item.id
      },
      {
        $set: {
          pub_date: item.pubDate,
          pub_date_str: item.pubDateStr,
          title: item.title,
          summary: item.summary,
          info_source: item.infoSource,
          source_url: item.sourceUrl,
          province_name: item.provinceName,
          created_time: moment(item.createTime).toDate(),
          modify_time: moment(item.modifyTime).toDate()
        }
      },
      {
        upsert: true
      }
    );
  }
  console.log("[sync-timeline] ended");
  console.log(
    `[sync] task finished at ${moment().format(
      "YYYY-MM-DD HH:mm:ss.SSS"
    )} spend: ${(new Date() - beginTimer) / 1000}s`
  );
}

exec()
  .then(() => {
    process.exit(0);
  })
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
