/**
 * Created with JetBrains WebStorm.
 * User: Scott
 * Date: 8/17/13
 * Time: 2:21 PM
 * To change this template use File | Settings | File Templates.
 */
// needs jquery loaded earlier
const MSINDAY = 86400000;

var accountData =
    [
        {
            // snapshot
            version: "1",
            date: "08/16/2013",
            notes: "initial snapshot",
            accounts: [
                {name: "Checking", balance: "1000.00",groups:["cash"]},
                {name: "Savings", balance: "2000.00",groups:["cash","savings"]},
                {name: "Brokerage", balance: "10000.00",groups:["investment"]}
            ]
        }
    ];

var modelData =
    [
        {
            name: "initial model",
            version: "1",
            date: "08/17/2013",
            data:
                [
                    { description: "paycheck", startDate: "09/14/2013", scheduleType: "biweekly", amountType:"Absolute", amount: "3500.00", fromAccount:"none", toAccount:"Checking" },
                    { description: "paycheck - J", startDate: "09/30/2013", scheduleType: "monthly", amountType:"Absolute", amount: "5000.00", fromAccount:"none", toAccount:"Checking" },
                    { description: "mortgage", startDate: "10/01/2013", scheduleType: "monthly", amountType:"Absolute", amount: "2700.00", fromAccount:"Checking", toAccount:"none" },
                    { description: "DirecTV", startDate: "09/15/2013", scheduleType: "monthly", amountType:"Absolute", amount: "180.00", fromAccount:"Checking", toAccount:"none" },
                    { description: "investment growth", startDate: "now", scheduleType: "weekly", amountType:"Percent of Balance", amount: "5.0", fromAccount: "none", toAccount:"Brokerage"},
                    { description: "transfer from checking to brokerage", startDate: "now", scheduleType: "weekly", amountType: "Absolute", amount: "100.00", fromAccount: "Checking", toAccount: "Brokerage"}
                ]
        }
    ];

/**
 * Get the ISO week date week number
 */
Date.prototype.getWeek = function () {
    // Create a copy of this date object
    var target  = new Date(this.valueOf());

    // ISO week date weeks start on monday
    // so correct the day number
    var dayNr   = (this.getDay() + 6) % 7;

    // ISO 8601 states that week 1 is the week
    // with the first thursday of that year.
    // Set the target date to the thursday in the target week
    target.setDate(target.getDate() - dayNr + 3);

    // Store the millisecond value of the target date
    var firstThursday = target.valueOf();

    // Set the target to the first thursday of the year
    // First set the target to january first
    target.setMonth(0, 1);
    // Not a thursday? Correct the date to the next thursday
    if (target.getDay() != 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }

    // The weeknumber is the number of weeks between the
    // first thursday of the year and the thursday in the target week
    return 1 + Math.ceil((firstThursday - target) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
}
/**
 * Get the ISO week date year number
 */
Date.prototype.getWeekYear = function ()
{
    // Create a new date object for the thursday of this week
    var target	= new Date(this.valueOf());
    target.setDate(target.getDate() - ((this.getDay() + 6) % 7) + 3);

    return target.getFullYear();
}
var FORECAST_DAYS = 365;

function buildTransactions() {
    var accounts = new Array();
    var snapshotDate = new Date();
    var weekTransactions = new Object();
    var monthTransactions = new Object();

    function addAccount(account) {
        account["transactions"]=new Array();
        var name= account["name"];
        accounts[name]=account;
    }

    function getLastDayOfMonth(year,month) {
        var lastDate;

        if (month<12) {
            lastDate = new Date(year,month+1,0);
        } else {
            lastDate = new Date(year+1,1,0);
        }
        return lastDate.getDay();
    }
    function calcNextDate(currentDate,scheduleType,scheduleOption) {
        //console.log('calcNextDate: current date= '+currentDate.toLocaleDateString());
        if (scheduleType=="once") {
            return null;
        } else {
            var newDate = new Date();


            switch (scheduleType) {
                case "weekly":
                    newDate.setTime(currentDate.getTime()+7* MSINDAY);
                    break;
                case "biweekly":
                    newDate.setTime(currentDate.getTime()+14*MSINDAY);
//                    console.log('added 14 days, new date='+newDate.toLocaleDateString());
                    break;
                case "monthly":
                    var newMonth,newYear,newDay;

                    if (currentDate.getMonth()<12) {
                        newMonth = currentDate.getMonth()+1;
                        newYear = currentDate.getYear();
                    } else {
                        newMonth=1;
                        newYear = currentDate.getYear()+1;
                    }

                    var lastDayOfMonth = getLastDayOfMonth(newYear,newMonth);
                    if (lastDayOfMonth < currentDate.getDay()) {
                        newDay = currentDate.getDay();
                    } else {
                        newDay = lastDayOfMonth;
                    }
                    newDate = new Date(newYear,newMonth,newDay);
                    break;

            }
            //console.log('new date='+newDate.toLocaleDateString());
            return newDate;
        }
    }
    function getYearWeek(thedate) {
        var year = thedate.getWeekYear().toString();
        var week = thedate.getWeek();

        return (year + "W" + ("00"+week).substr(-2));
    }
    function getYearMonth(thedate) {
        var month = thedate.getMonth();
        var year = thedate.getFullYear().toString();
        return (year + "-" + ("00"+month).substr(-2));
    }
    function seedCalendar() {
        var workingDate = new Date(snapshotDate.getTime());

        var endDate = new Date();
        endDate.setTime(workingDate.getTime()+FORECAST_DAYS*MSINDAY*2);

        var yearWeek;
        var yearMonth;
        var lastYearMonth;

        while (workingDate<endDate) {
            yearWeek = getYearWeek(workingDate);
            yearMonth=getYearMonth(workingDate);

            weekTransactions[yearWeek] = new Array();
            //console.log('seeding '+yearWeek);

            if (yearMonth!=lastYearMonth) {
                monthTransactions[yearMonth] = new Array();
                lastYearMonth=yearMonth;
                //console.log('seeding '+yearMonth);
            }
            workingDate.setTime(workingDate.getTime()+7*MSINDAY);
        }
    }
    function addEntry(entry,index,array) {
        console.log('adding entry = '+ JSON.stringify(entry));

        console.log("snapshot date="+snapshotDate.toLocaleDateString());
        var evaluationDate = new Date();

        if (entry["startDate"] != "now"){
            evaluationDate = new Date(entry["startDate"]);
        } else {
            evaluationDate.setTime(snapshotDate.getTime());
        }

        console.log('evalDate='+evaluationDate.toDateString());

        var endDate = new Date(2014,8,1);
        //endDate.setTime(snapshotDate.getTime() + FORECAST_DAYS*MSINDAY);
        console.log('endDate='+endDate.toLocaleDateString());

        var iterations = 5; // stop after 10 iterations  TODO: remove this hack

        while (evaluationDate<endDate) {
            if (evaluationDate>=snapshotDate) {
                var fromAccount=entry['fromAccount'];
                var toAccount=entry['toAccount'];

                if (fromAccount != 'none') {
                    var newTransaction = new Object();
                    var account = accounts[fromAccount];

                    newTransaction.date = evaluationDate;
                    newTransaction.account = fromAccount;
                    newTransaction.transactionType = "withdrawal";
                    newTransaction.transactionDescription = entry["description"];
                    newTransaction.amount = parseFloat(entry["amount"]);
                    newTransaction.amountType = entry["amountType"];
                    newTransaction.amountOption = entry["amountOption"];
                    newTransaction.yearWeek = getYearWeek(evaluationDate);
                    newTransaction.yearMonth = getYearMonth(evaluationDate);

                    //console.log('new transaction = '+JSON.stringify(newTransaction));
                    account["transactions"].push(newTransaction);
                    weekTransactions[newTransaction.yearWeek].push(newTransaction);
                    monthTransactions[newTransaction.yearMonth].push(newTransaction);
                }
                if (toAccount != 'none') {
                    var newTransaction = new Object();
                    var account = accounts[toAccount];

                    newTransaction.date = evaluationDate;
                    newTransaction.account = toAccount;
                    newTransaction.transactionType = "deposit";
                    newTransaction.transactionDescription = entry["description"];
                    newTransaction.amount = parseFloat(entry["amount"]);
                    newTransaction.amountType = entry["amountType"];
                    newTransaction.amountOption = entry["amountOption"];
                    newTransaction.yearWeek = getYearWeek(evaluationDate);
                    newTransaction.yearMonth = getYearMonth(evaluationDate);

//                    console.log('new transaction = '+JSON.stringify(newTransaction) + ' account=' +JSON.stringify(account));
                    account["transactions"].push(newTransaction);
                    if (undefined!=weekTransactions[newTransaction.yearWeek]) {
                        weekTransactions[newTransaction.yearWeek].push(newTransaction);
                    } else {
                        console.log('yearweek not found='+newTransaction.yearWeek) ;
                    }
                    monthTransactions[newTransaction.yearMonth].push(newTransaction);
                }
            }
            evaluationDate=calcNextDate(evaluationDate,entry["scheduleType"],entry["scheduleOption"]);
            if (null==evaluationDate) break;
            if (0== --iterations) break;  // TODO: remove hack
        }
    }

    function getWeekBalance(account,week) {
        var balances = account["weekBalances"];
        if (balances) {
            return balances[week];
        } else {
            return null;
        }
    }
    // accountBalances["Checking"]["2013FW33"] = balance
    function runModel(snapshot,weekTransactions,monthTransactions) {
        // todo: take model as argument
        var sourceAccounts = snapshot["accounts"];
        var accountLookup = new Object();

        var thisSnapshotDate = new Date(snapshot["date"]);
        var thisWeek = getYearWeek(thisSnapshotDate);
        var thisMonth = getYearMonth(thisSnapshotDate);
        var weekList = weekTransactions.keys;
        var monthList = monthTransactions.keys;

        sourceAccounts.forEach(function(account,index,array) {
            var thisWeeksBalance = parseFloat(account["balance"]);
            if (NaN==thisWeeksBalance) {
                thisWeeksBalance = 0.0;
            }
            var weekBalances = new Object();
            var monthBalances = new Object();
            var accountName = account["name"];

            weekBalances[thisWeek] = thisWeeksBalance;
            monthBalances[thisMonth] = thisWeeksBalance;

            accountLookup[accountName] = account;
            account["weekBalances"] = weekBalances;
            account["monthBalances"] = monthBalances;

            var previousWeekBalance = thisWeeksBalance;
            var weekKeys = Object.keys(weekTransactions);

            //console.log('week keys='+weekKeys);
            weekKeys.forEach( function(week,index,array) {
                var thisWeeksTransactions = weekTransactions[week];
                var currentBalance = previousWeekBalance;

                thisWeeksTransactions.forEach(function(tx,index,array) {
                    if (tx["account"]==accountName) {
                        switch (tx["amountType"]) {
                            case "Absolute":
                                switch (tx["transactionType"]) {
                                    case "deposit":
                                        currentBalance += tx["amount"];
                                        break;
                                    case "withdrawal":
                                        currentBalance -= tx["amount"];
                                        break;
                                }
                                break;
                            case "Percent of Balance":
                                console.log('percent of balance, amount='+tx["amount"]/52.0);
                                switch (tx["transactionType"]) {
                                    case "deposit":
                                        currentBalance += previousWeekBalance * tx["amount"]/52.0/100.0;
                                        break;
                                    case "withdrawal":
                                        currentBalance -= previousWeekBalance * tx["amount"]/52.0/100.0;
                                        break;
                                }
                                break;
                        }
                        console.log('week '+week+' balances for account '+accountName+' is '+currentBalance+
                            ' tx desc='+tx["transactionDescription"]);
                    }

                    weekBalances[week] = currentBalance;

                    previousWeekBalance = currentBalance;
                });
            });
            //console.log('checking weeks balance='+getWeekBalance(account,"2013W33"));
        });

        // test

    }
    console.log("Building transactions");


    // get latest snaphot
    var currentSnapshot = accountData[accountData.length-1];
    console.log( JSON.stringify(currentSnapshot));
    snapshotDate = new Date(currentSnapshot["date"]);
    console.log("snapshot date="+snapshotDate.toLocaleDateString());

    var currentAccounts = currentSnapshot["accounts"];
    console.log("currentAccounts = " + JSON.stringify(currentAccounts));

    currentAccounts.forEach(addAccount);
    console.log("accounts = "+JSON.stringify(accounts));

    // iterate through model
    seedCalendar();
    console.log('week keys='+ weekTransactions.keys);
    var currentModel = modelData[modelData.length-1];
    console.log("snapshot date="+snapshotDate.toLocaleDateString());
    var currentModelData = currentModel["data"];
    currentModelData.forEach(addEntry);

    console.log('accounts["Checking"]='+JSON.stringify(Object.keys(accounts)));
    console.log('week='+snapshotDate.getWeek()+' week year='+snapshotDate.getWeekYear());
    console.log('yearweek='+getYearWeek(new Date(2013,01,01)));
    console.log('transactions for checking by week:' +JSON.stringify(weekTransactions));
    runModel(currentSnapshot,weekTransactions,monthTransactions);


}

$(document).ready( function() {
    $("#loaddata").click(buildTransactions());
});