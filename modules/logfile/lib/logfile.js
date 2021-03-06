/**
 * Created with JetBrains WebStorm.
 * User: mschwartz
 * Date: 6/21/13
 * Time: 4:37 PM
 * To change this template use File | Settings | File Templates.
 */

/** @module LogFile */

/*global require, sync */
"use strict";

var File = require('File'),
    atExit = require('builtin.atExit'),
    {Thread} = require('Threads'),
    {sleep} = require('process');

/**
 * Create a new LogFile and thread to manage it.
 *
 * @param {string} filename - name/path of logfile on disk
 * @param {int} flushFrequency - how often, in seconds, to flush logfile to disk
 * @param {boolean} unlink - true to remove the file on exit.
 * @constructor
 */
function LogFile(filename, flushFrequency, unlink) {
    var me = this;

    me.filename = filename;
    me.flushFrequency = flushFrequency || 5;
    me.messages = [];
    me.file = new File(me.filename);

    /**
     * Print a string, followed by a newline to the log file.
     *
     * The line is not actually written to disk until flush() is called.
     *
     * @param {string} s - message to write to the log file
     * @chainable
     */
    me.println = sync(function (s) {
        me.messages.push(s + '\n');
        return me;
    });

    /**
     * Flush buffered log file messages to disk.
     *
     * This function is typically called by a thread that wakes up
     * every flushFrequency seconds and calls this.
     * @chainable
     */
    me.flush = sync(function () {
        me.file.writeFile(me.messages.join(''), true);
        //fs.appendFile(me.filename, me.messages.join(''));
        me.messages = [];
        return me;
    });
    me.state = 'running';
    me.thread = new Thread(function () {
        while (me.state === 'running') {
            sleep(me.flushFrequency);
            me.flush();
        }
        switch (me.state) {
            case 'destroy':
                me.file.remove();
                //fs.unlink(me.filename);
                break;
        }
        me.state = 'stopped';
    }).start();

    atExit(function () {
        me.flushFrequency = 1;
        console.log('waiting for logfile thread to complete');
        if (unlink) {
            me.destroy(true);
            console.log('logfile ' + me.filename + ' removed');
        }
        else {
            me.stop(true);
        }
    });

}

decaf.extend(LogFile.prototype, {

    /**
     * Wait for LogFile to go into stopped state
     */
    wait: function () {
        sleep(this.flushFrequency + 1);
        while (this.state !== 'stopped') {
            sleep(1);
        }
    },

    /**
     * Stop the LogFile (send it the stop signal)
     *
     * @param {boolean} wait wait for LogFile to go into stopped state if true.
     */
    stop: function (wait) {
        this.state = 'stop';
        if (wait) {
            this.wait();
        }
    },

    /**
     * Destroy the LogFile
     *
     * @param {boolean} wait wait for LogFile to go into stopped state if true.
     */
    destroy: function (wait) {
        this.state = 'destroy';
        if (wait) {
            this.wait();
        }
    }
});

decaf.extend(exports, {
    LogFile: LogFile
});
