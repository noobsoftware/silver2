/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Represents an info bar that shows a data submission notification.
 */
var gDataNotificationInfoBar = {
  _OBSERVERS: [
    "datareporting:notify-data-policy:request",
    "datareporting:notify-data-policy:close",
  ],

  _DATA_REPORTING_NOTIFICATION: "data-reporting",

  get _notificationBox() {
    delete this._notificationBox;
    return this._notificationBox = document.getElementById("global-notificationbox");
  },

  get _log() {
  },

  init: function() {
    window.addEventListener("unload", () => {
      for (let o of this._OBSERVERS) {
        Services.obs.removeObserver(this, o);
      }
    }, false);

    for (let o of this._OBSERVERS) {
      Services.obs.addObserver(this, o, true);
    }
  },

  _getDataReportingNotification: function (name=this._DATA_REPORTING_NOTIFICATION) {
    return this._notificationBox.getNotificationWithValue(name);
  },

  _displayDataPolicyInfoBar: function (request) {
    if (this._getDataReportingNotification()) {
      return;
    }

    let brandBundle = document.getElementById("bundle_brand");
    let appName = brandBundle.getString("brandShortName");
    let vendorName = brandBundle.getString("vendorShortName");

    let message = gNavigatorBundle.getFormattedString(
      "dataReportingNotification.message",
      [appName, vendorName]);

    this._actionTaken = false;

    let buttons = [{
      label: gNavigatorBundle.getString("dataReportingNotification.button.label"),
      accessKey: gNavigatorBundle.getString("dataReportingNotification.button.accessKey"),
      popup: null,
      callback: () => {
        this._actionTaken = true;
        window.openAdvancedPreferences("dataChoicesTab");
      },
    }];

    this._log.info("Creating data reporting policy notification.");
    this._notificationBox.appendNotification(
      message,
      this._DATA_REPORTING_NOTIFICATION,
      null,
      this._notificationBox.PRIORITY_INFO_HIGH,
      buttons,
      event => {
        if (event == "removed") {
          Services.obs.notifyObservers(null, "datareporting:notify-data-policy:close", null);
        }
      }
    );
    // It is important to defer calling onUserNotifyComplete() until we're
    // actually sure the notification was displayed. If we ever called
    // onUserNotifyComplete() without showing anything to the user, that
    // would be very good for user choice. It may also have legal impact.
    request.onUserNotifyComplete();
  },

  _clearPolicyNotification: function () {
    let notification = this._getDataReportingNotification();
    if (notification) {
      this._log.debug("Closing notification.");
      notification.close();
    }
  },

  observe: function(subject, topic, data) {
    switch (topic) {
      case "datareporting:notify-data-policy:request":
        let request = subject.wrappedJSObject.object;
        try {
          this._displayDataPolicyInfoBar(request);
        } catch (ex) {
          request.onUserNotifyFailed(ex);
          return;
        }
        break;

      case "datareporting:notify-data-policy:close":
        // If this observer fires, it means something else took care of
        // responding. Therefore, we don't need to do anything. So, we
        // act like we took action and clear state.
        this._actionTaken = true;
        this._clearPolicyNotification();
        break;

      default:
    }
  },

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIObserver,
    Ci.nsISupportsWeakReference,
  ]),
};
