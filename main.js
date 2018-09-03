angular.module('index', []).controller('tableContent', function ($scope) {
    init($scope);
    addCoursesToTable($scope, $scope.selectedCourseIds, courses_data);
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
    $scope.selectedCourseIds = ["btcg", "rtg", "pba", "test1", "test2", "test3", "test4", "test5", "test6", "test7", "test8", "test10"];
    //$scope.selectedCourseIds = ["btcg", "rtg", "pba", "test1", "test2", "test3", "test4"];

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

function countValidCourseIdObj(courseIdObjs) {
    var count = 0;
    for (var idx in courseIdObjs) {
        if (courseIdObjs[idx] != null) {
            count++;
        }
    }
    return count;
}

function refreshTable($scope, courses_data) {
    $scope.todayIdxList.length = 0;
    for (var i = 0; i < NUMBER_OF_DAY_PER_WEEK; i++) {
        var timeLineObjMap = $scope.timeLineOfDays[i];
        var headerSpan = 1;
        var startObjList = new Array();
        var followObjList = new Array();
        timeLineObjMap.forEach(function (timeLineObj) {
            var overlapCount = countValidCourseIdObj(timeLineObj.courseIdObjs);
            headerSpan = LCM(headerSpan, overlapCount);
            startObjList.length = 0;
            followObjList.length = 0;
            var accumFollowColSpan = 0;
            var avgFollowColSpan = headerSpan;
            for (var idx in timeLineObj.courseIdObjs) {
                var courseIdObj = timeLineObj.courseIdObjs[idx];
                if (courseIdObj != null) {
                    courseIdObj.startObj.overlapCount = Math.max(courseIdObj.startObj.overlapCount, overlapCount);
                }
                // if (courseIdObj.rowSpan > 0) {
                //     startObjList.push(courseIdObj);
                // }
                // else
                // {
                //     followObjList.push(courseIdObj);
                //     avgFollowColSpan = courseIdObj.startObj.colSpan;
                //     accumFollowColSpan += avgFollowColSpan;
                // }
            }
            // // has new courses start
            // if (startObjList.length > 0)
            // {
            //     var avgFirstObjColSpan = (headerSpan - accumFollowColSpan) / startObjList.length;
            //     if (avgFirstObjColSpan < avgFollowColSpan) {
            //         s
            //     }

            // }
            // else { // do not has new courses, evenly follow divide columns if has enough space

            // }
        });
        $scope.dayHeaders[i].span = headerSpan;
    }

    $scope.columnsOfTime.length = 0;
    for (var i in $scope.timePointList) {
        var timeObj = $scope.timePointList[i];
        $scope.columnsOfTime.push(getColumnsByTime($scope, timeObj));
    }
}

function getColumnsByTime($scope, timeObj) {
    var columns = new Array();
    // travel days of the week
    for (var dayIdx in $scope.dayHeaders) {
        var header = $scope.dayHeaders[dayIdx];
        var timeLineObjMap = $scope.timeLineOfDays[dayIdx];
        // has courses at current time point
        if (timeLineObjMap.has(timeObj.getHash())) {
            var timeLineObj = timeLineObjMap.get(timeObj.getHash());
            var preAccumColSpan = 0;
            var lastAccumColSpan = 0;
            // travel all overlap courses
            for (var courseIdx in timeLineObj.courseIdObjs) {
                var courseIdObj = timeLineObj.courseIdObjs[courseIdx];
                if (courseIdObj == null) {
                    continue;
                }
                var columnSpan = header.span / courseIdObj.startObj.overlapCount;
                if (courseIdObj.overlapIdx >= 0) {
                    courseIdObj.columnPos = preAccumColSpan;
                    columns.push({
                        colSpan: columnSpan, rowSpan: courseIdObj.rowSpan,
                        courseId: courseIdObj.courseId, time: timeObj, day: dayIdx
                    });
                }
                else
                {
                    var postAccumColSpan = courseIdObj.startObj.columnPos - preAccumColSpan;
                    if (postAccumColSpan > 0) {
                        columns.push({
                            colSpan: postAccumColSpan, rowSpan: 1,
                            courseId: "", time: timeObj, day: dayIdx
                        });
                        preAccumColSpan += postAccumColSpan;
                    }
                }
                preAccumColSpan += columnSpan;
            }
            if (preAccumColSpan < header.span) {
                columns.push({
                    colSpan: header.span - preAccumColSpan, rowSpan: 1,
                    courseId: "", time: timeObj, day: dayIdx
                });
            }
        }
        else {
            columns.push({
                colSpan: header.span, rowSpan: 1,
                courseId: "", time: timeObj, day: dayIdx
            });
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

function findMinAvailableOverlapIdx(courseIdObjs) {
    for (var idx in courseIdObjs) {
        if (courseIdObjs[idx] == null) {
            return idx;
        }
    }
    return courseIdObjs.length;
}

function expandArray(array, newSize, defaultValue) {
    var offset = newSize - array.length;
    while(offset > 0) {
        array.push(defaultValue);
        offset--;
    }
}

function insertToCourseIdObjArray(objArray, pos, courseIdObj) {
    expandArray(objArray, pos, null);
    objArray.push(null);
    for (var i = objArray.length - 1; i > pos; i--) {
        objArray[i] = objArray[i - 1];
    }
    objArray[pos] = courseIdObj;
}

function addCourseToTimeObjs(timeLineObjMap, courseId, startTime, endTime) {
    var currentTime = startTime;
    var rowSpan = (endTime.getHash() - startTime.getHash()) / MIN_TIME_INTERVAL;
    var startObj = null;
    while (isEarlierThan(currentTime, endTime)) {
        var timeObj = pickTimeObj(timeLineObjMap, currentTime);
        var courseIdObj = CreateCourseIdObj(courseId, rowSpan);
        var overlapIdx = 0;
        if (startObj == null) {
            startObj = courseIdObj;
            overlapIdx = findMinAvailableOverlapIdx(timeObj.courseIdObjs);
        }
        else
        {
            overlapIdx = startObj.overlapIdx;
        }
        courseIdObj.startObj = startObj;
        insertToCourseIdObjArray(timeObj.courseIdObjs, overlapIdx, courseIdObj);
        currentTime = tickToNextTime(currentTime);
        rowSpan = 0;
    }
}

function expandCourseFromStartToEnd(timeLineObjMap, startObj, startTime, endTime) {
    var currentTime = tickToNextTime(startTime);
    while(isEarlierThan(currentTime, endTime)) {
        var timeObj = pickTimeObj(timeLineObjMap, currentTime);
        var courseIdObj = CreateCourseIdObj(startObj.courseId, startObj.dateIdx);
        courseIdObj.startObj = startObj;
        insertToCourseIdObjArray(timeObj.courseIdObjs, startObj.overlapIdx, courseIdObj);
        currentTime = tickToNextTime(currentTime);
    }
}

// expand course from start time to end time
function expandCoursesOnTable($scope, courses_data) {
    // travel days of week
    for (var dayIdx in $scope.dayHeaders) {
        var header = $scope.dayHeaders[dayIdx];
        var timeLineObjMap = $scope.timeLineOfDays[dayIdx];
        // travel all time point
        for (var timeIdx in $scope.timePointList) {
            var timeObj = $scope.timePointList[timeIdx];
            // has courses start at current time point
            if (timeLineObjMap.has(timeObj.getHash())) {
                var timeLineObj = timeLineObjMap.get(timeObj.getHash());
                for (var courseIdx in timeLineObj.courseIdObjs) {
                    var courseIdObj = timeLineObj.courseIdObjs[courseIdx];
                    if (courseIdObj == null) {
                        continue;
                    }
                    var dateInfo = courses_data[courseIdObj.courseId].dates[courseIdObj.dateIdx];
                    var startTime = CreateTimeObjByString(dateInfo.startTime);
                    // if start at this time point, then expand it to the end time point
                    if (timeObj.getHash() == startTime.getHash()) {
                        var endTime = CreateTimeObjByString(dateInfo.endTime);
                        courseIdObj.rowSpan =  (endTime.getHash() - startTime.getHash()) / MIN_TIME_INTERVAL;
                        courseIdObj.overlapIdx = courseIdx;
                        expandCourseFromStartToEnd(timeLineObjMap, courseIdObj, startTime, endTime);
                    }
                }
            }
        }
    }
}

function addCourseStartToTable(timeLineOfDays, courseId, courses_data) {
    var courseData = courses_data[courseId];
    for (i in courseData.dates) {
        var dateInfo = courseData.dates[i];
        var startTime = CreateTimeObjByString(dateInfo.startTime);
        var timeObj = pickTimeObj(timeLineOfDays[dateInfo.day - 1], startTime);
        var courseIdObj = CreateCourseIdObj(courseId, i);
        courseIdObj.startObj = courseIdObj;
        timeObj.courseIdObjs.push(courseIdObj);
    }
}

function addCoursesToTable($scope, courseIds, courses_data) {
    for (i in courseIds) {
        addCourseStartToTable($scope.timeLineOfDays, courseIds[i], courses_data);
    }
    expandCoursesOnTable($scope, courses_data)
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

function CourseIdObj(id, dateIdx) {
    this.courseId = id;
    this.dateIdx = dateIdx;
    this.rowSpan = 1;
    this.colSpan = 1;
    this.columnPos = 0;
    this.startObj = null;
    this.overlapCount = 1;
    this.overlapIdx = -1;
}

function CreateCourseIdObj(id, dateIdx) {
    return new CourseIdObj(id, dateIdx);
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