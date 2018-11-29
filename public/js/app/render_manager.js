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

/** @module app/render_manager **/

/**
 * This module handles the rendering of pre-compiled templates that are sent by the server
 * @author Joseph Morris <JRM.Softworks@gmail.com>
 * @version 1.0
 * @since 1.0
 */
define(['jquery'], function(jQ) {

    /**
     * Renders a response from the server onto the page.
     * This function will perform the following for each root-level elements in the HTML string:
     *      1. Search for a data-target attribute on the element
     *      2. If found, set our render target to that value. If not, use the id attribute on the element
     *      3. Checks for the data-add attribute.
     *      4. If found, the render target will be replaced by the root-level element. If not, the render target will be
     *      emptied, and the root-level element's children will be added to the render target.
     *
     *      Note: if an element doesn't have either a data-target attribute or an id attribute, it will not be rendered.
     *
     * @param html The HTML received from the server
     */
    function renderResponse(html) {
        let rendered = jQ([]).add(html);
        let arr = jQ.makeArray(rendered);

        for (let el of arr) {
            el = jQ(el);
            let target = jQ(el.data('target'));
            if (target.length === 0) {
                target = jQ(`#${el.attr('id')}`);
            }
            if (target.length !== 0) {
                let addSelf = (el.data('add') && el.data('add') === 'self');
                if (addSelf) {
                    target.empty().append(el);
                } else {
                    target.empty().append(el.html());
                }
            }
        }
    }

    return {
            renderResponse: renderResponse
    };

});