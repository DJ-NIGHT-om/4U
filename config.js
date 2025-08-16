// --- تعليمات هامة جدا ---
// 1. اذهب إلى https://sheets.new لإنشاء جدول بيانات جوجل جديد.
// 2. في الصف الأول، قم بإنشاء العناوين التالية بالترتيب الدقيق:
//    id, date, location, phoneNumber, brideZaffa, groomZaffa, songs, notes, username, password
// 3. اذهب إلى "الإضافات" (Extensions) -> "برمجة تطبيقات" (Apps Script).
// 4. احذف أي كود موجود والصق الكود الموجود في الأسفل (من قسم GOOGLE_APPS_SCRIPT_CODE).
// 5. انقر على "نشر" (Deploy) -> "نشر جديد" (New deployment).
// 6. اختر "تطبيق ويب" (Web app) من قائمة "تحديد نوع" (Select type).
// 7. في حقل "من لديه حق الوصول" (Who has access)، اختر "أي شخص" (Anyone).
// 8. انقر على "نشر" (Deploy).
// 9. قم بمنح الأذونات اللازمة لحسابك في جوجل.
// 10. انسخ "عنوان URL لتطبيق الويب" (Web app URL) والصقه في المتغير GAS_URL_ENDPOINT بالأسفل.

// ---!!! هام: الرجاء لصق رابط تطبيق الويب الخاص بك هنا !!!---
// ---!!! IMPORTANT: PASTE YOUR WEB APP URL HERE !!!---
var GAS_URL_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzudjhmypRnjrsqAn_4KFLLC1uY_TpoP_z9Ngln-2diGEKnvVI5qKUtWH4tDAUjqz0_0Q/exec';
// ---!!! لا تقم بإزالة هذا السطر، فقط استبدل النص الموجود بين علامتي الاقتباس !!!---
// ---!!! DO NOT REMOVE THIS LINE, ONLY REPLACE THE TEXT BETWEEN THE QUOTES !!!---

// Make it globally accessible
window.GAS_URL_ENDPOINT = GAS_URL_ENDPOINT;
window.APP_TIMEZONE_OFFSET_HOURS = 4;

/* --- GOOGLE_APPS_SCRIPT_CODE --- (الصق هذا في محرر Apps Script)
const SHEET_NAME = 'Sheet1'; // Or your sheet's name
const SCRIPT_PROP = PropertiesService.getScriptProperties();

function setup() {
  const activeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  SCRIPT_PROP.setProperty('key', activeSheet.getParent().getId());
}

function doGet(e) {
  const sheet = SpreadsheetApp.openById(SCRIPT_PROP.getProperty('key')).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // remove header row
  const json = data.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SCRIPT_PROP.getProperty('key')).getSheetByName(SHEET_NAME);
    const data = JSON.parse(e.postData.contents);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (data.action === 'authenticate') {
      const username = data.username;
      const password = data.password;
      const dataRange = sheet.getDataRange().getValues();
      
      for (let i = 1; i < dataRange.length; i++) {
        const row = dataRange[i];
        const rowUsername = row[headers.indexOf('username')];
        const rowPassword = row[headers.indexOf('password')];
        
        if (rowUsername === username && rowPassword === password) {
          return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Login successful'})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Invalid credentials'})).setMimeType(ContentService.MimeType.JSON);
      
    } else if (data.action === 'register') {
      const username = data.username;
      const password = data.password;
      const dataRange = sheet.getDataRange().getValues();
      
      // Check if username already exists
      for (let i = 1; i < dataRange.length; i++) {
        const row = dataRange[i];
        const rowUsername = row[headers.indexOf('username')];
        
        if (rowUsername === username) {
          return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'اسم المستخدم موجود بالفعل'})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      // Create new user entry
      const newRow = new Array(headers.length).fill('');
      newRow[headers.indexOf('username')] = username;
      newRow[headers.indexOf('password')] = password;
      newRow[headers.indexOf('id')] = 'user_' + new Date().getTime();
      
      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'User registered successfully'})).setMimeType(ContentService.MimeType.JSON);
      
    } else if (data.action === 'resetPassword') {
      const username = data.username;
      const newPassword = data.password;
      const dataRange = sheet.getDataRange().getValues();
      
      for (let i = 1; i < dataRange.length; i++) {
        const row = dataRange[i];
        const rowUsername = row[headers.indexOf('username')];
        
        if (rowUsername === username) {
          sheet.getRange(i + 1, headers.indexOf('password') + 1).setValue(newPassword);
          return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Password reset successful'})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'اسم المستخدم غير موجود'})).setMimeType(ContentService.MimeType.JSON);

    } else if (data.action === 'delete') {
        const idToDelete = data.id;
        const idColumn = sheet.getRange("A:A").getValues();
        for (let i = idColumn.length - 1; i >= 1; i--) { // Iterate backwards to avoid index shifts
            if (idColumn[i][0] == idToDelete) {
                sheet.deleteRow(i + 1);
                return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Row deleted'})).setMimeType(ContentService.MimeType.JSON);
            }
        }
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ID not found'})).setMimeType(ContentService.MimeType.JSON);

    } else if (data.action === 'archive') { // New action to handle archiving
        const idsToDelete = data.ids;
        if (!idsToDelete || !Array.isArray(idsToDelete)) {
            return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Invalid IDs for archive'})).setMimeType(ContentService.MimeType.JSON);
        }
        const idColumn = sheet.getRange("A:A").getValues();
        let deletedCount = 0;
        // Iterate backwards to avoid index shifts when deleting rows
        for (let i = idColumn.length - 1; i >= 1; i--) {
            // Use .toString() to ensure correct type comparison
            if (idsToDelete.includes(idColumn[i][0].toString())) {
                sheet.deleteRow(i + 1);
                deletedCount++;
            }
        }
        return ContentService.createTextOutput(JSON.stringify({status: 'success', message: `${deletedCount} rows archived.`})).setMimeType(ContentService.MimeType.JSON);
        
    } else if (data.action === 'add' || data.action === 'edit') {
        const rowData = {
            id: data.id || new Date().getTime().toString(),
            date: data.date,
            location: data.location,
            phoneNumber: data.phoneNumber,
            brideZaffa: data.brideZaffa,
            groomZaffa: data.groomZaffa,
            songs: JSON.stringify(data.songs || []),
            notes: data.notes || '',
            username: data.username || '',
            password: data.password || ''
        };

        const rowAsArray = headers.map(header => rowData[header]);

        if (data.action === 'edit') {
             const idColumn = sheet.getRange("A:A").getValues();
             let rowToUpdate = -1;
             for (let i = 1; i < idColumn.length; i++) {
                if (idColumn[i][0] == data.id) {
                   rowToUpdate = i + 1;
                   break;
                }
             }
             if(rowToUpdate !== -1) {
                sheet.getRange(rowToUpdate, 1, 1, rowAsArray.length).setValues([rowAsArray]);
                return ContentService.createTextOutput(JSON.stringify({status: 'success', data: rowData})).setMimeType(ContentService.MimeType.JSON);
             } else {
                return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ID not found for update'})).setMimeType(ContentService.MimeType.JSON);
             }
        } else { // add
            sheet.appendRow(rowAsArray);
            return ContentService.createTextOutput(JSON.stringify({status: 'success', data: rowData})).setMimeType(ContentService.MimeType.JSON);
        }
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
*/