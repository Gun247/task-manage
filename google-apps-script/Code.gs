/**
 * FWF Task Manager — Google Apps Script API
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Copy the Web App URL to GOOGLE_APPS_SCRIPT_URL in .env.local
 */

const SHEETS = {
  Projects: ["id", "name", "description", "color", "sortOrder", "createdAt", "updatedAt"],
  Priorities: ["id", "label", "color", "sortOrder", "createdAt", "updatedAt"],
  Statuses: ["id", "name", "color", "sortOrder", "createdAt", "updatedAt"],
  TeamMembers: ["id", "nickname", "color", "isActive", "sortOrder", "createdAt", "updatedAt"],
  Tasks: [
    "id", "name", "description", "remarks", "taskType",
    "startDate", "endDate", "sortOrder", "projectId",
    "priorityId", "statusId", "assigneeId", "createdAt", "updatedAt",
  ],
  StatusHistories: [
    "id", "taskId", "fromStatusId", "fromStatusName",
    "toStatusId", "toStatusName", "changedAt", "createdAt", "updatedAt",
  ],
};

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const body = e.postData ? JSON.parse(e.postData.contents) : {};
    const action = body.action || e.parameter.action;
    const payload = body.payload || {};

    const result = dispatch(action, payload);
    return jsonResponse({ ok: true, data: result });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  }
}

function dispatch(action, payload) {
  switch (action) {
    case "ensureStructure": return ensureStructure();
    case "seedDefaults": return seedDefaults();
    case "getAll": return getAll(payload.sheet);
    case "create": return createRow(payload.sheet, payload.data);
    case "update": return updateRow(payload.sheet, payload.id, payload.data);
    case "delete": return deleteRow(payload.sheet, payload.id);
    case "updateMany": return updateMany(payload.sheet, payload.field, payload.value, payload.data);
    default: throw new Error("Unknown action: " + action);
  }
}

function jsonResponse(obj, status) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheet(sheetName, columns) {
  let sheet = ss().getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss().insertSheet(sheetName);
  }
  const header = sheet.getRange(1, 1, 1, columns.length).getValues()[0];
  if (!header[0]) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
  }
  return sheet;
}

function ensureStructure() {
  Object.keys(SHEETS).forEach(function(name) {
    ensureSheet(name, SHEETS[name]);
  });
  return { success: true };
}

function seedDefaults() {
  ensureStructure();
  if (getAll("Projects").length === 0) {
    createRow("Projects", {
      id: Utilities.getUuid(),
      name: "FWF Task Manager",
      description: "Foreigner Worker Fund",
      color: "#1E3A5F",
      sortOrder: 0,
    });
  }
  if (getAll("Priorities").length === 0) {
    [
      { label: "P0", color: "#EF4444", sortOrder: 0 },
      { label: "P1", color: "#F97316", sortOrder: 1 },
      { label: "P2", color: "#6B7280", sortOrder: 2 },
    ].forEach(function(p) {
      createRow("Priorities", Object.assign({ id: Utilities.getUuid() }, p));
    });
  }
  var statusDefaults = [
    { name: "Backlog", color: "#6B7280", sortOrder: 0 },
    { name: "In Progress", color: "#3B82F6", sortOrder: 1 },
    { name: "Done", color: "#1E3A5F", sortOrder: 2 },
    { name: "UAT", color: "#F97316", sortOrder: 3 },
    { name: "PRD", color: "#22C55E", sortOrder: 4 },
  ];
  var existingStatuses = getAll("Statuses");
  if (existingStatuses.length === 0) {
    statusDefaults.forEach(function(s) {
      createRow("Statuses", Object.assign({ id: Utilities.getUuid() }, s));
    });
  } else {
    statusDefaults.forEach(function(s) {
      var match = existingStatuses.find(function(item) { return item.name === s.name; });
      if (match) {
        updateRow("Statuses", match.id, { color: s.color });
      }
    });
  }
  return { success: true };
}

function getAll(sheetName) {
  const columns = SHEETS[sheetName];
  const sheet = ensureSheet(sheetName, columns);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  return values
    .filter(function(row) { return row[0]; })
    .map(function(row) { return rowToRecord(columns, row); });
}

function rowToRecord(columns, row) {
  const record = {};
  columns.forEach(function(col, i) {
    var val = row[i];
    if (val === "") {
      record[col] = col === "assigneeId" ? null : "";
    } else if (col === "isActive") {
      record[col] = val === true || val === "TRUE";
    } else if (col === "sortOrder") {
      record[col] = Number(val) || 0;
    } else {
      record[col] = String(val);
    }
  });
  return record;
}

function recordToRow(columns, record) {
  return columns.map(function(col) {
    var val = record[col];
    if (val === null || val === undefined) return "";
    if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
    return String(val);
  });
}

function createRow(sheetName, data) {
  const columns = SHEETS[sheetName];
  const sheet = ensureSheet(sheetName, columns);
  const now = new Date().toISOString();
  const record = Object.assign({}, data, {
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
  });
  sheet.appendRow(recordToRow(columns, record));
  return record;
}

function updateRow(sheetName, id, data) {
  const columns = SHEETS[sheetName];
  const sheet = ensureSheet(sheetName, columns);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("Row not found: " + id);

  const values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === id) {
      var current = rowToRecord(columns, values[i]);
      var updated = Object.assign({}, current, data, {
        id: id,
        updatedAt: new Date().toISOString(),
      });
      sheet.getRange(i + 2, 1, 1, columns.length).setValues([recordToRow(columns, updated)]);
      return updated;
    }
  }
  throw new Error("Row not found: " + id);
}

function deleteRow(sheetName, id) {
  const columns = SHEETS[sheetName];
  const sheet = ensureSheet(sheetName, columns);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true };

  const values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === id) {
      sheet.deleteRow(i + 2);
      return { success: true };
    }
  }
  return { success: true };
}

function updateMany(sheetName, field, value, data) {
  const rows = getAll(sheetName);
  var count = 0;
  rows.forEach(function(row) {
    if (row[field] === value) {
      updateRow(sheetName, row.id, data);
      count++;
    }
  });
  return { count: count };
}
