const fs = require("fs");
const path = require("path");

module.exports = async () => {
  const filePath = path.join(__dirname, "..", "data", "student-goals.e2e.json");
  const payload = {
    students: {},
    drafts: {}
  };

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
};

