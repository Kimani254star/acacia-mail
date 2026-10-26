/* acacia-mail-bridge.js - lets the shared Acacia right bar (acacia-sidebar.js), Support chat (acacia-support.js)
 * and Appearance card (acacia-appearance.js) work inside Acacia Mail. Load it BEFORE those three files.
 * Mail keeps its own login (CURRENT in script.js); this only describes that login to the shared files. */
(function (w) {
  'use strict';
  w.ACX_APP = 'Mail';
  w.__SUPA_URL__ = w.__SUPA_URL__ || 'https://xglsampckermarjpczdf.supabase.co';
  w.__SUPA_KEY__ = w.__SUPA_KEY__ || 'sb_publishable_x-dPR7pzhvJgag9soW0I8w_yfKTmi6A';
  function cur() { try { return CURRENT || null; } catch (e) { return null; } }
  /* used by the right bar (Notebook, Webinars, Team Status, Organization Details) and by Support */
  w.acxSession = function () {
    var c = cur(); if (!c) return null;
    var id = String(c.booksCompanyId || c.companyId || ''); if (!id) return null;
    return { companyId: id, obj: { email: c.email || '', name: c.name || '', fullName: c.name || '', username: c.email || '', companyId: id, companyName: c.company || '' } };
  };
  w.currentUser = function () { var s = w.acxSession(); return s ? s.obj : null; };
  w.toggleSupportPopup = function () { if (typeof w.acxOpenSupportPanel === 'function') w.acxOpenSupportPanel(); };
})(window);
