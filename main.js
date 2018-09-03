angular.module('index', []).controller('tableContent', function ($scope) {
    init($scope);
    addCoursesToTable($scope.timeLineOfDays, $scope.selectedCourseIds, courses_data);
    refreshTable($scope, courses_data);
})

MIN_TIME_INTERVAL = 30;
NUMBER_OF_DAY_PER_WEEK = 5;
START_TIME = CreateTimeObjByHM(9, 0);
END_TIME = CreateTimeObjByHM(18, 0);

function init($scope) {
    $scope.dayHeaders = [{ text: "Mon", span: 1 }, { text: "Tue", span: 1 }, { text: "Wed", span: 1 }, { text: "Thu", span: 1 }, { text: "Fri", span: 1 }];
    $scope.todayIdxList = new Array();
    $scope.columnsOfTime = new Array();
    $scope.timeLineOfDays = CreatetimeLineOfDays();
    $scope.selectedCourseIds = ["btcg", "rtg", "pba", "test1", "test2", "test3", "test4"];

    var timePointList = new Array();
    var currentTime = START_TIME;
    while (isEarlierThanOrEqualTo(currentTime, END_TIME)) {
        var timeObj = CreateTimeObjByHM(currentTime.hh, currentTime.mm);
        timePointList.push(timeObj);
        currentTime = tickToNextTime(currentTime);
    }
    $scope.timePointList = timePointList;
    $scope.tickToNextTime = tickToNextTime;
    $scope.timeObjToString = function (timeObj) {
        var str = timeObj.hh + ':' + (timeObj.mm < 10 ? '0' + timeObj.mm : timeObj.mm);
        return str;
    }
}

function refreshTable($scope, courses_data) {
    $scope.todayIdxList.length = 0;
    for (var i = 0; i < NUMBER_OF_DAY_PER_WEEK; i++) {
        var timeLineObjMap = $scope.timeLineOfDays[i];
        var headerSpan = 1;
        timeLineObjMap.forEach(function (timeLineObj) {
            headerSpan = LCM(headerSpan, timeLineObj.courseIdObjs.length);
        });
        $scope.dayHeaders[i].span = headerSpan;
    }

    $scope.columnsOfTime.length = 0;
    for (var i in $scope.timePointList) {
        var timeObj = $scope.timePointList[i];
        $scope.columnsOfTime.push(getColumnsByTime($scope, timeObj));
    }
}

function getColumnsByTime ($scope, timeObj) {
    var columns = new Array();
    for (var dayIdx in $scope.dayHeaders) {
        var header = $scope.dayHeaders[dayIdx];
        var timeLineObjMap = $scope.timeLineOfDays[dayIdx];
        if (timeLineObjMap.has(timeObj.getHash())) {
            var timeLineObj = timeLineObjMap.get(timeObj.getHash());
            var columnSpan = header.span / timeLineObj.courseIdObjs.length;
            for (var courseIdx in timeLineObj.courseIdObjs) {
                var courseIdObj = timeLineObj.courseIdObjs[courseIdx];
                if (courseIdObj.rowSpan != 0) {
                    columns.push({colSpan:columnSpan,            
                                            rowSpan:courseIdObj.rowSpan,  
                                            courseId:courseIdObj.id,
                                            time:timeObj,
                                            day:dayIdx});
                }
            }
        }
        else {
            columns.push({colSpan:header.span, rowSpan:1, courseId:"", time:timeObj, day:dayIdx});
        }
    }
    return columns;
}

function CreatetimeLineOfDays() {
    var map = new Array(NUMBER_OF_DAY_PER_WEEK);
    for (var i = 0; i < NUMBER_OF_DAY_PER_WEEK; i++) {
        map[i] = new Map();
    }
    return map;
}

function isEarlierThan(timeA, timeB) {
    if (timeA.hh == timeB.hh)
        return timeA.mm < timeB.mm;
    else
        return timeA.hh < timeB.hh;
}

function isEarlierThanOrEqualTo(timeA, timeB) {
    if (timeA.hh == timeB.hh)
        return timeA.mm <= timeB.mm;
    else
        return timeA.hh < timeB.hh;
}

function tickToNextTime(timeObj) {
    var obj = CreateTimeObjByHM(0, 0)
    obj.mm = timeObj.mm + MIN_TIME_INTERVAL;
    obj.hh = timeObj.hh + Math.floor(obj.mm / 60);
    obj.mm %= 60;
    return obj;
}

function pickTimeObj(timeObjMap, timeObj) {
    var obj = null;
    if (timeObjMap.has(timeObj.getHash())) {
        obj = timeObjMap.get(timeObj.getHash());
    }
    else {
        obj = new TimeLineObj();
        timeObjMap.set(timeObj.getHash(), obj);
    }
    return obj;
}

function addCourseToTimeObjs(timeLineObjMap, courseId, startTime, endTime) {
    var currentTime = startTime;
    var rowSpan = (endTime.getHash() - startTime.getHash()) / MIN_TIME_INTERVAL;
    var firstObj = null;
    while (isEarlierThan(currentTime, endTime)) {
        var timeObj = pickTimeObj(timeLineObjMap, currentTime);
        var courseIdObj = CreateCourseIdObj(courseId, rowSpan);
        if (firstObj == null) {
            firstObj = courseIdObj;
        }
        courseIdObj.firstObj = firstObj;
        timeObj.courseIdObjs.push(courseIdObj);
        currentTime = tickToNextTime(currentTime);
        rowSpan = 0;
    }
}

function addCourseToTable(timeLineOfDays, courseId, courses_data) {
    var courseData = courses_data[courseId];
    for (i in courseData.dates) {
        var dateInfo = courseData.dates[i];
        var startTime = CreateTimeObjByString(dateInfo.startTime);
        var endTime = CreateTimeObjByString(dateInfo.endTime);
        addCourseToTimeObjs(timeLineOfDays[dateInfo.day - 1], courseId, startTime, endTime);
    }
}

function addCoursesToTable(timeLineOfDays, courseIds, courses_data) {
    for (i in courseIds) {
        addCourseToTable(timeLineOfDays, courseIds[i], courses_data);
    }
}

function TimeObj(hh, mm) {
    this.hh = hh;
    this.mm = mm;
    this.getHash = function () {
        return this.hh * 60 + this.mm;
    }
}

function CreateTimeObjByString(timeStr) {
    var obj = new TimeObj(0, 0)
    var time = timeStr.split(':');
    if (time.length >= 2) {
        obj.hh = parseInt(time[0]);
        obj.mm = parseInt(time[1]);
    }
    return obj;
}

function CreateTimeObjByHM(hh, mm) {
    return new TimeObj(hh, mm);
}

function TimeLineObj() {
    this.courseIdObjs = new Array();
}

function CourseIdObj(id, rowSpan) {
    this.id = id;
    this.rowSpan = rowSpan;
}

function CreateCourseIdObj(id, rowSpan) {
    return new CourseIdObj(id, rowSpan);
}

function GCD(a, b) {
    //辗转相除法
    if (a == 0)
        return b;
    return GCD(b % a, a);
}

function LCM(a, b) {
    return a / GCD(a, b) * b
};