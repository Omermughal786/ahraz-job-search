const CV_SKILLS = [
  ["2nd line", 14], ["second line", 14], ["desktop support", 14], ["deskside", 12],
  ["euc", 10], ["service desk", 10], ["it support", 10], ["deployment", 10],
  ["intune", 12], ["sccm", 10], ["servicenow", 9], ["microsoft 365", 9],
  ["office 365", 9], ["entra id", 9], ["azure active directory", 9], ["active directory", 8],
  ["windows 11", 8], ["windows 10", 6], ["macos", 6], ["ivanti", 7], ["mdm", 7],
  ["pxe", 6], ["imaging", 6], ["reimaging", 6], ["hardware", 5], ["troubleshooting", 6],
  ["sla", 4], ["networking", 4], ["dhcp", 3], ["dns", 3], ["tcp/ip", 3],
  ["printer", 3], ["onboarding", 4], ["offboarding", 4], ["remote support", 5]
];

const TARGET = /(2nd line|second line|desktop support|deskside|euc|end user|service desk|it support|deployment|technical support|workplace support|support engineer|support analyst)/i;
const TOO_SENIOR = /(3rd line|third line|architect|head of|director|manager|lead engineer|devops|software developer|data engineer)/i;

function clean(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function scoreJob(job) {
  const text = `${job.title} ${job.description} ${job.company} ${job.location}`.toLowerCase();
  let score = 18;
  const matched = [];

  for (const [skill, points] of CV_SKILLS) {
    if (text.includes(skill)) {
      score += points;
      matched.push(skill);
    }
  }

  if (TARGET.test(job.title)) score += 22;
  if (/london|united kingdom|uk|remote/i.test(job.location)) score += 5;
  if (/contract|temporary|fixed term/i.test(`${job.contract} ${job.description}`)) score += 3;
  if (TOO_SENIOR.test(job.title)) score -= 28;
  if (/1st line|first line|helpdesk/i.test(job.title)) score -= 3;

  score = Math.max(35, Math.min(97, Math.round(score)));
  let callChance = Math.round(score * 0.72) + (score >= 85 ? 5 : 0) - (TOO_SENIOR.test(job.title) ? 8 : 0);
  callChance = Math.max(22, Math.min(82, callChance));

  const top = [...new Set(matched)].slice(0, 7);
  return {
    score,
    call_chance: callChance,
    matched_skills: top,
    fit_reason: top.length
      ? `Matches ${top.slice(0, 5).join(", ")}${top.length > 5 ? " and related support skills" : ""}.`
      : "Relevant support title, but the advert contains limited detail about Ahraz's strongest technologies."
  };
}

async function fetchArbeitnow() {
  const response = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    headers: { "user-agent": "AhrazJobDashboard/1.0" }
  });
  if (!response.ok) throw new Error(`Arbeitnow ${response.status}`);
  const data = await response.json();
  return (data.data || []).map(item => ({
    id: `arbeitnow-${item.slug}`,
    title: clean(item.title),
    company: clean(item.company_name || "Employer not stated"),
    location: clean(item.location || (item.remote ? "Remote" : "Location not stated")),
    description: clean(item.description),
    created: item.created_at ? new Date(item.created_at * 1000).toISOString() : new Date().toISOString(),
    url: item.url,
    salary_min: null,
    salary_max: null,
    salary_is_predicted: false,
    contract: item.remote ? "Remote" : "Type not stated",
    source: "Arbeitnow"
  }));
}

async function fetchRemotive() {
  const response = await fetch("https://remotive.com/api/remote-jobs?category=customer-support&limit=100", {
    headers: { "user-agent": "AhrazJobDashboard/1.0" }
  });
  if (!response.ok) throw new Error(`Remotive ${response.status}`);
  const data = await response.json();
  return (data.jobs || []).map(item => ({
    id: `remotive-${item.id}`,
    title: clean(item.title),
    company: clean(item.company_name || "Employer not stated"),
    location: clean(item.candidate_required_location || "Remote"),
    description: clean(item.description),
    created: item.publication_date || new Date().toISOString(),
    url: item.url,
    salary_min: null,
    salary_max: null,
    salary_is_predicted: false,
    contract: clean(item.job_type || "Remote"),
    source: "Remotive"
  }));
}

exports.handler = async function () {
  try {
    const settled = await Promise.allSettled([fetchArbeitnow(), fetchRemotive()]);
    const raw = settled.flatMap(result => result.status === "fulfilled" ? result.value : []);

    if (!raw.length) throw new Error("No public job feeds responded");

    const unique = new Map();
    for (const job of raw) {
      const key = `${job.title}|${job.company}|${job.location}`.toLowerCase();
      if (!unique.has(key)) unique.set(key, job);
    }

    const jobs = [...unique.values()]
      .map(job => ({ ...job, ...scoreJob(job) }))
      .filter(job => TARGET.test(job.title) || job.score >= 65)
      .sort((a, b) => b.score - a.score || new Date(b.created) - new Date(a.created))
      .slice(0, 60);

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=900, s-maxage=1800",
        "access-control-allow-origin": "*"
      },
      body: JSON.stringify({ fetched_at: new Date().toISOString(), jobs })
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "Live job feeds are temporarily unavailable. Please try again shortly." })
    };
  }
};
