var app = angular.module('index', []);
app.controller('main', function ($scope) {
    $scope.courses_data = courses_data;
    $scope.selected_courses = selected_courses;
    $scope.total_required_ects = total_required_ects;
    init($scope);
    loadCourseIds($scope);
    addCoursesToTable($scope, $scope.selectedCourseIds, courses_data);
    refreshTable($scope);
    refreshCourseSelectionInfo($scope);
})

app.filter('courseCat', function() { //可以注入依赖
    return function(coursesDataMap, showCat) {
        var retList = new Array();
        for (var courseIdx in coursesDataMap) {
            if (coursesDataMap[courseIdx].cat == showCat) {
                retList.push(coursesDataMap[courseIdx]);
            }
        }
        return retList;
    }
});

const MIN_TIME_INTERVAL = 15;
const NUMBER_OF_DAY_PER_WEEK = 5;
const START_TIME = CreateTimeObjByHM(9, 0);
const END_TIME = CreateTimeObjByHM(18, 30);
const URL_PARAM_NAME_SEMESTER_IDX = "semester";

function init($scope) {
    $scope.dayHeaders = [{ text: "Mon", span: 1 }, { text: "Tue", span: 1 }, { text: "Wed", span: 1 }, { text: "Thu", span: 1 }, { text: "Fri", span: 1 }];
    $scope.todayIdxList = new Array();
    $scope.columnsOfTime = new Array();
    $scope.timeLineOfDays = CreatetimeLineOfDays();
    $scope.semesterIdx = getUrlParam(URL_PARAM_NAME_SEMESTER_IDX, 0);
    $scope.semesterECTS = null;
    $scope.totalSelectedECTS = null;
    $scope.neverSelectedCourseIds = null;
    $scope.showingCatIdx = null;

    var timePointList = new Array();
    var currentTime = START_TIME;
    while (isEarlierThan(currentTime, END_TIME)) {
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
    $scope.getCourseDuration = function (courseId, dateIdx) {
        if (courseId != null) {
            var dateInfo = $scope.courses_data[courseId].dates[dateIdx];
            var startTimeObj = CreateTimeObjByString(dateInfo.startTime);
            var endTimeObj = CreateTimeObjByString(dateInfo.endTime);
            return durationOfTimeSectionInMM(startTimeObj, endTimeObj);
        }
        return 0;
    }
    $scope.getNeverSelectedCourseIds = function () {
        var courses = new Array();
        $scope.neverSelectedCourseIds.forEach(function (courseId) {
            courses.push(courseId);
        });
        return courses;
    }
    $scope.onSemClicked = function (semIdx) {
        window.location.search = '?semester=' + semIdx;
    }
    $scope.getSemStyle = function (semIdx) {
        if (semIdx == $scope.semesterIdx) {
            return "selected";
        }
    }
    $scope.sumTotalECTS = function (ectsMap) {
        var sum = 0;
        for (var idx in ectsMap) {
            sum += ectsMap[idx].value;
        }
        return sum;
    }
    $scope.showCourseListOfCat = function(catIdx) {
        $scope.showingCatIdx = catIdx;
    }
    $scope.getSelectedStatus = function(courseId) {
        var retStatus = {};
        if ($scope.neverSelectedCourseIds.has(courseId)) {
            retStatus.status = "unselected";
        }
        else {
             if($scope.selectedCourseIds.has(courseId)) {
                retStatus.status = "selected-this-sem";
                retStatus.text = "Selected";
            }
            else {
                retStatus.status = "selected-other-sem";
                retStatus.text = "Selected*";
            }
            retStatus.semIdx = getSemIdxWithCourseId($scope, courseId);
        }
        return retStatus;
    }
}

function getSemIdxWithCourseId($scope, courseId) {
    var found = false;
    var retIdx = 0;
    for (var idx in $scope.selected_courses) {
        var courseIds = $scope.selected_courses[idx].courseIds;
        found = false;
        for (var courseIdx in courseIds) {
            if (courseId == courseIds[courseIdx]) {
                found = true;
                break;
            }
        }
        if (found) {
            retIdx = idx;
            break;
        }
    }
    return retIdx;
}

function refreshCourseSelectionInfo($scope) {
    $scope.neverSelectedCourseIds = getAllCourseIds($scope);
    $scope.totalSelectedECTS = {};
    for (var semIdx in $scope.selected_courses) {
        var semCourseInfo = $scope.selected_courses[semIdx];
        for (var courseIdx in semCourseInfo.courseIds) {
            var courseId = semCourseInfo.courseIds[courseIdx];
            if ($scope.neverSelectedCourseIds.has(courseId)) {
                // this course is choosed, delete it from the list
                $scope.neverSelectedCourseIds.delete(courseId);
                // count this course into the selected ECTS
                var courseData = $scope.courses_data[courseId];
                if ($scope.totalSelectedECTS[courseData.cat] == null) {
                    $scope.totalSelectedECTS[courseData.cat] = { cat: courseData.cat, value: 0 };
                }
                $scope.totalSelectedECTS[courseData.cat].value += courseData.ects;
            }
        }
    }
}

function getUrlParam(paramName, defaultValue) {
    var url = window.location.search;
    var retParam = defaultValue;
    var paramStartIdx = url.indexOf("?")
    if (paramStartIdx != -1) {
        var paramStr = url.substr(paramStartIdx + 1);
        var paramPairs = paramStr.split("&");
        for (var i in paramPairs) {
            var paramPair = paramPairs[i];
            if (typeof (paramPair) == "string") {
                paramPair = paramPair.split("=");
                paramPair[1] = unescape(paramPair[1]);
                paramPairs[i] = paramPair;
            }
            if (paramPair[0] == paramName) {
                retParam = paramPair[1];
            }
        }
    }
    return retParam;
}

function loadCourseIds($scope) {
    for (var courseId in $scope.courses_data) {
        $scope.courses_data[courseId].courseId = courseId;
    }

    $scope.selectedCourseIds = new Set();
    $scope.unselectedCourseIds = getAllCourseIds($scope);

    if ($scope.semesterIdx >= $scope.selected_courses.length) {
        $scope.semesterIdx = $scope.selected_courses.length - 1;
    }
    var semesterCourseInfo = $scope.selected_courses[$scope.semesterIdx];
    $scope.semesterName = semesterCourseInfo.semester;
    for (var idx in semesterCourseInfo.courseIds) {
        selectCourseById($scope, semesterCourseInfo.courseIds[idx]);
    }

    $scope.semesterECTS = {};
    $scope.selectedCourseIds.forEach(function (courseId) {
        var courseData = $scope.courses_data[courseId];
        if ($scope.semesterECTS[courseData.cat] == null) {
            $scope.semesterECTS[courseData.cat] = { cat: courseData.cat, value: 0 };
        }
        $scope.semesterECTS[courseData.cat].value += courseData.ects;
    });
}

function selectCourseById($scope, courseId) {
    if ($scope.unselectedCourseIds.has(courseId)) {
        $scope.unselectedCourseIds.delete(courseId);
        $scope.selectedCourseIds.add(courseId);
    }
}

function unselectCourseById($scope, courseId) {
    if ($scope.selectedCourseIds.has(courseId)) {
        $scope.selectedCourseIds.delete(courseId);
        $scope.unselectedCourseIds.add(courseId);
    }
}

function getAllCourseIds($scope) {
    var ids = new Set();
    for (courseId in $scope.courses_data) {
        ids.add(courseId);
    }
    return ids;
}

function durationOfTimeSectionInMM(startTimeObj, endTimeObj) {
    return endTimeObj.getHash() - startTimeObj.getHash();
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

function refreshTable($scope) {
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
            for (var idx in timeLineObj.courseIdObjs) {
                var courseIdObj = timeLineObj.courseIdObjs[idx];
                if (courseIdObj != null) {
                    courseIdObj.startObj.overlapCount = Math.max(courseIdObj.startObj.overlapCount, overlapCount);
                }
            }
        });
        $scope.dayHeaders[i].span = headerSpan;
    }

    $scope.columnsOfTime.length = 0;
    for (var i in $scope.timePointList) {
        var timeObj = $scope.timePointList[i];
        $scope.columnsOfTime.push(getColumnsByTime($scope, timeObj));
    }
}

function getBorderStyle(courseIdObj) {
    var style = "";
    if (courseIdObj.overlapIdx >= 0) {
        style += " cell-not-empty";
    }
    if (courseIdObj.overlapIdx == 0) {
        style += " cell-leftmost";
    }
    return style;
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
            // travel all overlap courses
            for (var courseIdx in timeLineObj.courseIdObjs) {
                var courseIdObj = timeLineObj.courseIdObjs[courseIdx];
                if (courseIdObj == null) {
                    continue;
                }
                var columnSpan = header.span / courseIdObj.startObj.overlapCount;
                // only add the start object as column
                if (courseIdObj.overlapIdx >= 0) {
                    courseIdObj.columnPos = preAccumColSpan;
                    columns.push({
                        colSpan: columnSpan, rowSpan: courseIdObj.rowSpan,
                        courseId: courseIdObj.courseId, dateIdx: courseIdObj.dateIdx,
                        border: getBorderStyle(courseIdObj),
                        debug: { time: timeObj, day: dayIdx }
                    });
                }
                else {
                    var postAccumColSpan = courseIdObj.startObj.columnPos - preAccumColSpan;
                    // add skipped(previous continue) empty column
                    if (postAccumColSpan > 0) {
                        columns.push({
                            colSpan: postAccumColSpan, rowSpan: 1,
                            courseId: null, dateIdx: -1,
                            border: "cell-empty cell-rightmost",
                            debug: { time: timeObj, day: dayIdx }
                        });
                        preAccumColSpan += postAccumColSpan;
                    }
                }
                preAccumColSpan += columnSpan;
            }
            // add empty column at the end of the row
            if (preAccumColSpan < header.span) {
                columns.push({
                    colSpan: header.span - preAccumColSpan, rowSpan: 1,
                    courseId: null, dateIdx: -1,
                    border: "cell-empty cell-leftmost",
                    debug: { time: timeObj, day: dayIdx }
                });
            }
        }
        else {
            // no course at this time point
            columns.push({
                colSpan: header.span, rowSpan: 1,
                courseId: null, dateIdx: -1,
                border: "cell-empty",
                debug: { time: timeObj, day: dayIdx }
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

function expandArray(array, newSize, defaultValue) {
    var offset = newSize - array.length;
    while (offset > 0) {
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

function expandCourseFromStartToEnd(timeLineObjMap, startObj, startTime, endTime) {
    var currentTime = tickToNextTime(startTime);
    while (isEarlierThan(currentTime, endTime)) {
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
                        courseIdObj.rowSpan = (endTime.getHash() - startTime.getHash()) / MIN_TIME_INTERVAL;
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
    courseIds.forEach(function (courseId) {
        addCourseStartToTable($scope.timeLineOfDays, courseId, courses_data);
    });
    expandCoursesOnTable($scope, courses_data);
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