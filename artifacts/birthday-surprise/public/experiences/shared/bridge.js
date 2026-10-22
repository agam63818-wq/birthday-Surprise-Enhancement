/*
 * Shared classic-script bridge for bundled experiences.
 * The frame is sandboxed without allow-same-origin, so its origin is opaque
 * and postMessage intentionally uses "*". The host still pins every message
 * to iframe.contentWindow and validates its schema.
 */
(function () {
  "use strict";

  if (window.__experience) return;

  var VERSION = 1;
  var MAX_DEPTH = 8;
  var MAX_NODES = 2000;
  var MAX_CHARACTERS = 60000;
  var MAX_STRING = 6000;
  var MAX_ARRAY = 512;
  var tokens = ["--exp-accent", "--exp-accent-2", "--exp-bg", "--exp-text"];
  var listeners = { init: [], update: [], pause: [], resume: [], replay: [] };

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function plainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function text(value, max, allowEmpty) {
    if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.length)) return false;
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return false;
    if (/<\s*\/?\s*[a-z][^>]*>/i.test(value)) return false;
    if (/(?:javascript|vbscript)\s*:/i.test(value)) return false;
    return true;
  }

  function boundedJson(value, depth, budget) {
    budget.nodes += 1;
    if (budget.nodes > MAX_NODES || depth > MAX_DEPTH) return false;
    if (value === null || typeof value === "boolean") return true;
    if (typeof value === "number") return isFinite(value);
    if (typeof value === "string") {
      budget.characters += value.length;
      return budget.characters <= MAX_CHARACTERS && text(value, MAX_STRING, true);
    }
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY || Object.keys(value).length !== value.length) return false;
      for (var i = 0; i < value.length; i += 1) {
        if (!own(value, String(i)) || !boundedJson(value[i], depth + 1, budget)) return false;
      }
      return true;
    }
    if (!plainObject(value)) return false;
    var entries = Object.entries(value);
    for (var j = 0; j < entries.length; j += 1) {
      var key = entries[j][0];
      if (key === "__proto__" || key === "prototype" || key === "constructor" || !text(key, 120, false)) return false;
      budget.characters += key.length;
      if (budget.characters > MAX_CHARACTERS || !boundedJson(entries[j][1], depth + 1, budget)) return false;
    }
    return true;
  }

  function theme(value) {
    if (!plainObject(value)) return false;
    var entries = Object.entries(value);
    for (var i = 0; i < entries.length; i += 1) {
      if (tokens.indexOf(entries[i][0]) < 0 || !text(entries[i][1], 128, true)) return false;
      if (/[;{}<>\\]/.test(entries[i][1]) || /(?:url|expression|behavior|@import)\s*\(?/i.test(entries[i][1])) return false;
      if (!/^[#a-z0-9.,%()\s/+-]+$/i.test(entries[i][1])) return false;
    }
    return true;
  }

  function exact(value, fields, required) {
    if (!plainObject(value)) return false;
    for (var i = 0; i < required.length; i += 1) if (!own(value, required[i])) return false;
    var entries = Object.entries(value);
    for (var j = 0; j < entries.length; j += 1) {
      if (!own(fields, entries[j][0]) || !fields[entries[j][0]](entries[j][1])) return false;
    }
    return true;
  }

  function validHostMessage(value) {
    try {
      if (!plainObject(value) || value.v !== VERSION || typeof value.type !== "string") return false;
      var base = { v: function (v) { return v === VERSION; } };
      if (value.type === "init") {
        return exact(value, {
          v: base.v,
          type: function (v) { return v === "init"; },
          experience: function (v) { return ["heart-tunnel", "love-confession", "love-drive"].indexOf(v) >= 0; },
          config: function (v) { return plainObject(v) && boundedJson(v, 0, { nodes: 0, characters: 0 }); },
          theme: theme,
          reducedMotion: function (v) { return typeof v === "boolean"; },
          muted: function (v) { return typeof v === "boolean"; },
          occasion: function (v) { return text(v, 64, false); }
        }, ["v", "type", "experience", "config", "theme", "reducedMotion", "muted", "occasion"]);
      }
      if (value.type === "update") {
        return exact(value, {
          v: base.v,
          type: function (v) { return v === "update"; },
          muted: function (v) { return typeof v === "boolean"; },
          reducedMotion: function (v) { return typeof v === "boolean"; },
          theme: theme
        }, ["v", "type"]);
      }
      if (["pause", "resume", "replay"].indexOf(value.type) >= 0) {
        return exact(value, {
          v: base.v,
          type: function (v) { return v === value.type; }
        }, ["v", "type"]);
      }
    } catch (error) {
      return false;
    }
    return false;
  }

  function cleanError(value, fallback, max) {
    var result = typeof value === "string" ? value : fallback;
    result = result.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/</g, "‹").replace(/>/g, "›");
    return (result || fallback).slice(0, max);
  }

  function post(type, details) {
    var message = { v: VERSION, type: type };
    if (details) {
      Object.keys(details).forEach(function (key) { message[key] = details[key]; });
    }
    window.parent.postMessage(message, "*");
  }

  function emit(name, args) {
    listeners[name].slice().forEach(function (listener) {
      try {
        listener.apply(null, args || []);
      } catch (error) {
        api.error("BRIDGE_LISTENER_ERROR", error && error.message ? error.message : "Experience listener failed");
      }
    });
  }

  function subscribe(name, callback) {
    if (typeof callback !== "function") return function () {};
    listeners[name].push(callback);
    return function () {
      var index = listeners[name].indexOf(callback);
      if (index >= 0) listeners[name].splice(index, 1);
    };
  }

  var api = {
    config: {},
    theme: {},
    muted: true,
    reducedMotion: false,
    occasion: "",
    experience: null,
    paused: false,
    initialized: false,
    onInit: function (callback) { return subscribe("init", callback); },
    onUpdate: function (callback) { return subscribe("update", callback); },
    onPause: function (callback) { return subscribe("pause", callback); },
    onResume: function (callback) { return subscribe("resume", callback); },
    onReplay: function (callback) { return subscribe("replay", callback); },
    next: function () { post("next"); },
    complete: function () { post("complete"); },
    replayed: function () { post("replayed"); },
    error: function (code, message) {
      post("error", {
        code: cleanError(code, "EXPERIENCE_ERROR", 64),
        message: cleanError(message, "The experience could not continue.", 200)
      });
    }
  };

  window.__experience = api;

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !validHostMessage(event.data)) return;
    var message = event.data;
    if (message.type === "init") {
      var expected = document.body && document.body.getAttribute("data-experience");
      if (expected && expected !== message.experience) {
        api.error("EXPERIENCE_MISMATCH", "The host selected a different experience.");
        return;
      }
      api.experience = message.experience;
      api.config = message.config;
      api.theme = message.theme;
      api.muted = message.muted;
      api.reducedMotion = message.reducedMotion;
      api.occasion = message.occasion;
      api.initialized = true;
      emit("init", [api]);
      return;
    }
    if (message.type === "update") {
      if (own(message, "muted")) api.muted = message.muted;
      if (own(message, "reducedMotion")) api.reducedMotion = message.reducedMotion;
      if (message.theme) api.theme = Object.assign({}, api.theme, message.theme);
      emit("update", [api]);
      return;
    }
    if (message.type === "pause") {
      api.paused = true;
      emit("pause", [api]);
      return;
    }
    if (message.type === "resume") {
      api.paused = false;
      emit("resume", [api]);
      return;
    }
    if (message.type === "replay") {
      api.paused = false;
      emit("replay", [api]);
    }
  });

  var previousOnError = window.onerror;
  window.onerror = function (message, source, line, column, error) {
    api.error("FRAME_ERROR", error && error.message ? error.message : message);
    if (typeof previousOnError === "function") {
      return previousOnError.call(window, message, source, line, column, error);
    }
    return false;
  };
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    api.error("FRAME_REJECTION", reason && reason.message ? reason.message : String(reason || "Unhandled promise rejection"));
  });

  // DOMContentLoaded listeners in the original scripts run before this
  // deferred ready notification, so init is delivered after their setup.
  function announceReady() {
    setTimeout(function () { post("ready"); }, 0);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", announceReady, { once: true });
  } else {
    announceReady();
  }
}());
