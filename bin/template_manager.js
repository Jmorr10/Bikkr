/*
 * MIT License
 *
 * Copyright (c) 2018 Joseph R. Morris
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
*/

"use strict";

/**
 * Manages rendering and sending templates to the clients.
 *
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */

/** @module template_manager **/

const ConnectionManager = require('./connection_manager');
const Events = require('./event_types');
const path = require('path');
const Handlebars = require('handlebars')
const SASS = require('node-sass');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
const Messages = require("./messages");
const PlayerList = require("./player_list");

const helpers = require('handlebars-helpers')();

let handlebars = require('express-handlebars').create({
    handlebars: allowInsecurePrototypeAccess(Handlebars),
    layoutsDir: path.join(__dirname, "../views/layouts"),
    partialsDir: path.join(__dirname, "../views/partials"),
    defaultLayout: 'main',
    helpers: Object.assign({
        for: forHelper,
        sass: render_sass,
        lang: getMessage
    }, helpers)
});

let io = ConnectionManager.getIO();
const TEMPLATE_ROOT = path.join(__dirname, "../views/");

/**
 * Sends a precompiled template to be rendered by the client
 *
 * @param socketID The socket.io room to send the template to
 * @param templateName The name of the template to send
 * @param context The context to use for compiling the template
 */
function sendPrecompiledTemplate(socketID, templateName, context) {

    if (!io) {
        io = ConnectionManager.getIO();
        if (!io) {
            return;
        }
    }

    if (Array.isArray(socketID)) {
        for (const soc of socketID) {
            let player = PlayerList.getPlayerBySocketID(soc);
            context["INT_MESSAGES"] = (player && player.japaneseLang) ? Messages.jpn : Messages.default;
            sendPrecompiledTemplate(soc, templateName, context);
        }
    } else {
        let player = PlayerList.getPlayerBySocketID(socketID);
        context["INT_MESSAGES"] = (player && player.japaneseLang) ? Messages.jpn : Messages.default;

        handlebars.render(getTemplatePath(templateName), context)
            .then(function (data) {
                io.sockets.to(socketID).emit(Events.RENDER_TEMPLATE, data);
            })
            .catch(function (err) {
                console.log(err);
            });

    }
}

/**
 * Sends a template without using Events.RENDER_TEMPLATE. This allows the client to do additional
 * processing before manually rendering the template.
 *
 * @param socketID The socket.io room to send the template to
 * @param templateName The name of the template to send
 * @param context The context to use for compiling the template
 * @param eventType A member of the Events enum
 * @param args Any additional arguments to be passed into the client's listening function
 */
function emitWithTemplate(socketID, templateName, context, eventType, ...args) {

    if (!io) {
        io = ConnectionManager.getIO();
        if (!io) {
            return;
        }
    }

    if (Array.isArray(socketID)) {
        for (const soc of socketID) {
            let player = PlayerList.getPlayerBySocketID(soc);
            context["INT_MESSAGES"] = (player && player.japaneseLang) ? Messages.jpn : Messages.default;
            emitWithTemplate(soc, templateName, context, eventType, ...args);
        }
    } else {
        let player = PlayerList.getPlayerBySocketID(socketID);
        context["INT_MESSAGES"] = (player && player.japaneseLang) ? Messages.jpn : Messages.default;
        handlebars.render(getTemplatePath(templateName), context)
            .then(function (data) {
                // The spread operator (...) is used here to convert args (an Array) back into individual arguments.
                io.sockets.to(socketID).emit(eventType, data, ...args);
            })
            .catch(function (err) {
                console.log(err);
            });
    }
}

/**
 * Provides a convenient method for sending the same template with individualized contexts.
 *
 * @param socketArray The socket.io ids to send the template
 * @param templateName The name of the template to send
 * @param contextArray The contexts to use for each socket id
 * @param eventType A member of the Events enum
 * @param args Any additional arguments to be passed into the client's listening function
 */
function emitWithIndividualizedTemplate(socketArray, templateName, contextArray, eventType, ...args) {
    if (!io) {
        io = ConnectionManager.getIO();
        if (!io) {
            return;
        }
    }

    if (Array.isArray(socketArray) && Array.isArray(contextArray) && socketArray.length === contextArray.length) {
        for (let i = 0; i < socketArray.length; i++) {
            let player = PlayerList.getPlayerBySocketID(socketArray[i]);
            context["INT_MESSAGES"] = (player && player.japaneseLang) ? Messages.jpn : Messages.default;
            emitWithTemplate(socketArray[i], templateName, contextArray[i], eventType, ...args);
        }
    } else {
        throw Error("socketArray and contextArray must be populated arrays of equal length!");
    }
}

/**
 * Provides a convenience method for sending multiple templates at the same time.
 * Each template can have its own context, or a single context can be used for all templates.
 *
 * @param socketID The socket.io room to send the template to
 * @param templateNames An array of the names of the templates to send
 * @param contexts An array of contexts to use for compiling the templates
 * @param eventType A member of the Events enum
 * @param args Any additional arguments to be passed into the client's listening function.
 */
function emitWithTemplateArray(socketID, templateNames, contexts, eventType, ...args) {

    if (!io) {
        io = ConnectionManager.getIO();
        if (!io) {
            return;
        }
    }

    // Check if each template has its own context
    if (templateNames && contexts && templateNames.length === contexts.length) {
        let player = PlayerList.getPlayerBySocketID(socketID);
        for (let i = 0, len = templateNames.length; i < len; i++) {
            contexts[i]["INT_MESSAGES"] = (player && player.japaneseLang) ? Messages.jpn : Messages.default;
            emitWithTemplate(socketID, templateNames[i], contexts[i], eventType, ...args);
        }

    } else if (contexts && contexts.length === 1) {

        // We are using only one context for all the templates here
        // contexts is an array, so contexts[0] is necessary
        let player = PlayerList.getPlayerBySocketID(socketID);
        for (let i = 0, len = templateNames.length; i < len; i++) {
            contexts[0]["INT_MESSAGES"] = (player && player.japaneseLang) ? Messages.jpn : Messages.default;
            emitWithTemplate(socketID, templateNames[i], contexts[0], eventType, ...args);
        }

    } else{
        throw Error("templateNames and contexts must be the same length OR " +
            "an array with a single context must be provided.");
    }
}

function getTemplatePath(templateName) {
    return TEMPLATE_ROOT + templateName + handlebars.extname;
}

/**
 * Provides a for loop helper in handlebars templates
 * Shamelessly borrowed from
 * {@link https://stackoverflow.com/questions/11924452/iterating-over-basic-for-loop-using-handlebars-js}
 */
function forHelper (from, to, incr, block) {
    let accum = '';
    for(let i = from; i < to; i += incr)
        accum += block.fn(i);
    return accum;
}

function render_sass (sassString) {
    return SASS.renderSync({
        data: sassString
    }).css.toString();
}

function getMessage(userLangJpn, messageKey, default_val) {
    let messageSet = (userLangJpn) ? Messages.jpn : Messages.default;
    return (messageKey && messageSet.hasOwnProperty(messageKey)) ? messageSet[messageKey] : (default_val) ? default_val : "";
}

module.exports = {
    sendPrecompiledTemplate: sendPrecompiledTemplate,
    emitWithTemplate: emitWithTemplate,
    emitWithIndividualizedTemplate: emitWithIndividualizedTemplate,
    emitWithTemplateArray: emitWithTemplateArray,
    getTemplatePath: getTemplatePath,
    handlebars: handlebars
};


