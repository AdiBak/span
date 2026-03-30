/**
 * Bound to the "SPAN Medium OTP log" spreadsheet. Deploy as Web App:
 * Execute as: Me, Who has access: Anyone (secret in POST body).
 * Time trigger: processPendingMediumForwards every minute.
 *
 * Label + thread APIs: use getThread() — GmailMessage has no getLabels/addLabel.
 */
var LABEL_NAME = 'SPAN/Medium-OTP-forwarded';

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
}

function getOrCreateLabel() {
  var labels = GmailApp.getUserLabels();
  for (var i = 0; i < labels.length; i++) {
    if (labels[i].getName() === LABEL_NAME) return labels[i];
  }
  return GmailApp.createLabel(LABEL_NAME);
}

function doPost(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('FORWARD_SECRET');
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'invalid json' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (!body || body.secret !== secret) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var forwardTo = (body.forwardToEmail || '').trim().toLowerCase();
  if (!forwardTo || !forwardTo.endsWith('@spanationwide.org')) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'bad forward email' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  for (var r = data.length; r >= 2; r--) {
    if (data[r - 1][3] !== true) sheet.deleteRow(r);
  }

  var now = new Date();
  var expires = new Date(now.getTime() + 10 * 60 * 1000);
  sheet.appendRow([forwardTo, now, expires, false]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function processPendingMediumForwards() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  var now = new Date();
  var label = getOrCreateLabel();
  var tz = Session.getScriptTimeZone();

  for (var i = 1; i < data.length; i++) {
    var rowNum = i + 1;
    var forwardTo = data[i][0];
    var requestedAt = data[i][1];
    var expiresAt = data[i][2];
    var processed = data[i][3] === true;

    if (processed) continue;
    if (!(requestedAt instanceof Date)) requestedAt = new Date(requestedAt);
    if (!(expiresAt instanceof Date)) expiresAt = new Date(expiresAt);

    if (now > expiresAt) {
      sheet.getRange(rowNum, 4).setValue(true);
      continue;
    }

    var afterStr = Utilities.formatDate(requestedAt, tz, 'yyyy/MM/dd');
    var threads = GmailApp.search('from:medium after:' + afterStr, 0, 30);

    var foundMsg = null;
    outer: for (var t = 0; t < threads.length; t++) {
      var msgs = threads[t].getMessages();
      for (var m = 0; m < msgs.length; m++) {
        var msg = msgs[m];
        if (msg.getFrom().toLowerCase().indexOf('medium') === -1) continue;
        if (msg.getDate().getTime() < requestedAt.getTime() - 120000) continue;
        var threadLabels = msg.getThread().getLabels();
        var already = false;
        for (var li = 0; li < threadLabels.length; li++) {
          if (threadLabels[li].getName() === LABEL_NAME) {
            already = true;
            break;
          }
        }
        if (already) continue;
        foundMsg = msg;
        break outer;
      }
    }

    if (!foundMsg) return;

    var subject = foundMsg.getSubject();
    var plain = foundMsg.getPlainBody();
    var html = foundMsg.getBody();

    GmailApp.sendEmail(
      forwardTo,
      '[SPAN] Medium login message (forwarded)',
      plain || 'See HTML part.',
      {
        htmlBody: html || undefined,
        name: 'SPAN (Medium OTP)',
      }
    );

    // Must run before labeling: if label fails, we still must not resend every minute.
    sheet.getRange(rowNum, 4).setValue(true);

    try {
      foundMsg.getThread().addLabel(label);
      foundMsg.markRead();
    } catch (err) {
      console.error('medium-otp label/markRead', err);
    }
    return;
  }
}
