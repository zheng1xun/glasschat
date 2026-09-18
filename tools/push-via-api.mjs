// 通过 api.github.com（国内可直连）把本地仓库完整推送到 GitHub：
// 建仓库（如不存在）→ 逐文件创建 blob → 建 tree → 建 commit → 指向 main。
// 用法: node tools/push-via-api.mjs <TOKEN> [repo名] [private]
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TOKEN = process.argv[2];
const REPO = process.argv[3] || "glasschat";
const IS_PRIVATE = process.argv[4] === "private";
if (!TOKEN) {
  console.error("用法: node tools/push-via-api.mjs <TOKEN> [repo名]");
  process.exit(1);
}

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.github.com";
const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "glasschat-uploader",
};

async function api(method, path, body, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API + path, {
        method,
        headers: H,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 422 && method === "POST" && path === "/user/repos") {
        return { __exists: true }; // 仓库已存在
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`  重试 ${path} (${err.message.slice(0, 80)})`);
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

// 1. 验证令牌、拿到用户名
const me = await api("GET", "/user");
const owner = me.login;
console.log(`✓ 令牌有效，GitHub 用户: ${owner}`);

// 2. 确认仓库（细粒度令牌不能建仓，只能推到已有仓库；经典令牌才走创建）
const checkRes = await fetch(`${API}/repos/${owner}/${REPO}`, { headers: H });
if (checkRes.ok) {
  console.log(`✓ 使用已有仓库: ${owner}/${REPO}`);
} else if (checkRes.status === 404) {
  const repo = await api("POST", "/user/repos", {
    name: REPO,
    private: IS_PRIVATE,
    auto_init: false,
    description: "琉璃 GlassChat — iOS 26 液态玻璃 AI 聊天（DeepSeek 直连）",
  });
  if (repo.__exists) {
    console.log(`✓ 仓库已存在: ${owner}/${REPO}`);
  } else {
    console.log(`✓ 仓库已创建: ${owner}/${REPO}`);
  }
} else {
  throw new Error(`检查仓库失败: HTTP ${checkRes.status}`);
}

// 3. 收集文件列表（git ls-files，自动遵守 .gitignore）
const files = execSync("git ls-files", { cwd: REPO_ROOT, encoding: "utf8" })
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean);
console.log(`共 ${files.length} 个文件待上传`);

// 3.5 空仓库不允许直接写 git 对象（409），先用 Contents API 放一个初始提交
const branchRes = await fetch(`${API}/repos/${owner}/${REPO}/branches/main`, { headers: H });
if (branchRes.status === 404) {
  console.log("仓库为空，先写入初始提交…");
  await api("PUT", `/repos/${owner}/${REPO}/contents/.gitkeep`, {
    message: "init",
    content: Buffer.from("\n").toString("base64"),
    branch: "main",
  });
  console.log("✓ 初始提交完成");
}

// 4. 逐文件创建 blob
const treeItems = [];
for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const content = readFileSync(join(REPO_ROOT, file)).toString("base64");
  const blob = await api("POST", `/repos/${owner}/${REPO}/git/blobs`, {
    content,
    encoding: "base64",
  });
  treeItems.push({ path: file, mode: "100644", type: "blob", sha: blob.sha });
  if ((i + 1) % 10 === 0 || i === files.length - 1) {
    console.log(`  blob 进度: ${i + 1}/${files.length}`);
  }
}

// 5. 建 tree → commit → ref（在现有 main 上叠加，保留历史）
let parentSha = null;
const mainRes2 = await fetch(`${API}/repos/${owner}/${REPO}/branches/main`, { headers: H });
if (mainRes2.ok) {
  parentSha = (await mainRes2.json()).commit.sha;
  console.log(`基于现有提交 ${parentSha.slice(0, 7)} 增量更新`);
}
const tree = await api("POST", `/repos/${owner}/${REPO}/git/trees`, { tree: treeItems });
const commit = await api("POST", `/repos/${owner}/${REPO}/git/commits`, {
  message: process.argv[5] || "更新",
  tree: tree.sha,
  parents: parentSha ? [parentSha] : [],
});
try {
  await api("POST", `/repos/${owner}/${REPO}/git/refs`, {
    ref: "refs/heads/main",
    sha: commit.sha,
  });
} catch {
  await api("PATCH", `/repos/${owner}/${REPO}/git/refs/heads/main`, {
    sha: commit.sha,
    force: true,
  });
}

console.log(`\n✅ 上传完成: https://github.com/${owner}/${REPO}`);
console.log("Actions 会自动开始编译（build-ios），几分钟后可查询状态。");
