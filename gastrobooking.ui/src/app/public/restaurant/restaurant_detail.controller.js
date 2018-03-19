/**
 * Created by Thomas on 10/10/2016.
 */

(function () {
    'use strict';

    angular
        .module('app.restaurant')
        .controller('RestaurantDetailController', RestaurantDetailController)
        .directive('modalDialog', function () {
            return {
                restrict: 'E',
                scope: {
                    show: '='
                },
                replace: true, // Replace with the template below
                transclude: true, // we want to insert custom content inside the directive
                link: function (scope, element, attrs) {
                    scope.dialogStyle = {};
                    if (attrs.width)
                        scope.dialogStyle.width = attrs.width;
                    if (attrs.height)
                        scope.dialogStyle.height = attrs.height;

                    scope.hideModal = function () {
                        scope.show = false;

                    };
                },
                templateUrl: 'app/public/dialog/template.html' // See below
            };
        });

    /*@ngNoInject*/
    function RestaurantDetailController($scope, $state, RestaurantDetailService, appConstant, $rootScope, $stateParams, $translate, $filter, FileUploader, $location) {
        var vm = this;
        vm.changeFirstPic = changeFirstPic;
        vm.restaurant = null;
        vm.menuTypes = [];
        vm.currentMenuType = [];
        vm.searchParams = [];
        vm.menuSubGroups = [];
        vm.menuOfTheDay = [];
        vm.photosFound = false;
        vm.currentMenuType = null;
        vm.currentMenuTypeId = null;
        vm.currentGroup = null;
        vm.currentGroupId = null;
        vm.isMenuOfTheDay = false;
        vm.getMenuSubGroups = [];
        vm.menuDay = null;
        vm.getMenuTypes = getMenuTypes;
        vm.switchToMenuType = switchToMenuType;
        vm.addMenuListToCart = addMenuListToCart;
        vm.search = search;
        vm.getMenuOfTheDay = getMenuOfTheDay;
        vm.setCurrentMenuGroup = setCurrentMenuGroup;
        vm.setMenuOfTheDay = setMenuOfTheDay;

        vm.menuOfTheDayLoading = false;

        // Set restaurant Id from state param
        vm.restaurantId = $stateParams.restaurantId;
        if ($stateParams.type=='') vm.type = 'B';
        else vm.type = $stateParams.type;
        vm.setFoodImage = setFoodImage;
        vm.location_not_choosen = "";
        vm.deleteFoodImage = deleteFoodImage;
        vm.closeModal = closeModal;

        vm.weekDay = [
            'RESTAURANT_DETAIL.MONDAY',
            'RESTAURANT_DETAIL.TUESDAY',
            'RESTAURANT_DETAIL.WEDNESDAY',
            'RESTAURANT_DETAIL.THURSDAY',
            'RESTAURANT_DETAIL.FRIDAY',
            'RESTAURANT_DETAIL.SATURDAY',
            'RESTAURANT_DETAIL.SUNDAY'];

        vm.weekDayShort = [
            'RESTAURANT_DETAIL.MONDAY_SHORT',
            'RESTAURANT_DETAIL.TUESDAY_SHORT',
            'RESTAURANT_DETAIL.WEDNESDAY_SHORT',
            'RESTAURANT_DETAIL.THURSDAY_SHORT',
            'RESTAURANT_DETAIL.FRIDAY_SHORT',
            'RESTAURANT_DETAIL.SATURDAY_SHORT',
            'RESTAURANT_DETAIL.SUNDAY_SHORT'
        ];
        vm.search_time = new Date().getTime();

        var client_percentage = 0;
        var commision_split = 0;

        vm.client_commission = 0;
        vm.member_commission = 0;

        (getURLParameter('menudirection') == 'right') ? $scope.chevron = 'fa-chevron-left' : $scope.chevron = 'fa-chevron-right';

        vm.currentRequests = currentRequests;
        vm.getrequestOfTheDay = getrequestOfTheDay;
        vm.countMissingBooking = countMissingBooking;

        if ($stateParams.app == 'widget') {
            localStorage.setItem('widget__restaurantId', $stateParams.restaurantId);
        }


        $scope.convertToDate = function (stringDate) {
            if (stringDate) {
                var dateOut = new Date(stringDate);
            }
            else {
                return
            }
            return dateOut;
        };

        $scope.convertToTime = function (stringDate) {
            if (stringDate) {
                var dateElements = stringDate.split(':');
            }
            else {
                return;
            }
            var date = new Date();
            date.setHours(dateElements[0]);
            date.setMinutes(dateElements[1]);
            return date;
        };

        $scope.getDeadLine = function (stringDate) {
            var now = $filter('date')(new Date(), 'yyyy-MM-dd HH:mm:ss');
            var then = stringDate;
            var diff = moment.duration(moment(then).diff(moment(now)));

            var days = parseInt(diff.asDays());

            var hours = parseInt(diff.asHours());
            hours = hours - days * 24;

            var minutes = parseInt(diff.asMinutes());
            minutes = minutes - (days * 24 * 60 + hours * 60);

            if (days > 0) {
                var obj = days + ' days';
            }
            else if (hours > 0) {
                var obj = hours + ' hours';
            }
            else if (minutes > 0) {
                var obj = minutes + ' minutes';
            }
            else {
                var obj = 'past';
            }

            return obj;
        };


        $scope.storeRestaurantData = function (restaurantData, serveDate, serveTime, mealname) {
            var requestData = {
                "restaurantData": restaurantData,
                "serveDate": serveDate,
                "serveTime": serveTime,
                "mealname": mealname
            };
            localStorage.setItem("requestData", JSON.stringify(requestData));
            if (!$rootScope.currentUser) {
                $state.go("main.login");
            }
            else {
                $state.go("main.clientDashboard");
            }
            return;
        }


        if (localStorage.getItem('requestDataBack')) {
            var requestDataBack = JSON.parse(localStorage.getItem('requestDataBack'));
            var serveDate = requestDataBack.serveDate;
            var serve_at = $filter('date')(new Date(serveDate), 'dd.MM.yyyy HH:mm');
            if (serveDate != '') {
                vm.dates = serveDate;
            }
            else {
                var now = new Date();
                now.setHours(now.getHours() + 1);
                vm.dates = now;
            }
            localStorage.removeItem("requestDataBack");
        }
        else {

            if (localStorage.getItem('high_serve_at')) {
                vm.dates = new Date(localStorage.getItem('high_serve_at'));
                localStorage.removeItem('high_serve_at');
            } else if (localStorage.getItem('search')) {
                var searchParams = JSON.parse(localStorage.getItem('search'));
                vm.searchParams.time = new Date(searchParams.time);
                vm.searchParams.date = new Date(searchParams.date);
                vm.searchParams.date.setHours(vm.searchParams.time.getHours(), vm.searchParams.time.getMinutes());

                vm.dates = vm.searchParams.date;
            } else {
                var now = new Date();
                now.setHours(now.getHours() + 1);
                vm.dates = now;
            }
        }

        function getrequestOfTheDay() {
            var searchParamsdate = $filter('date')(new Date(vm.searchParams.date), 'yyyy-MM-dd HH:mm:ss');
            currentRequests($stateParams.restaurantId, searchParamsdate);
            countMissingBooking($stateParams.restaurantId);
        }

        countMissingBooking($stateParams.restaurantId);
        function countMissingBooking(restaurantId) {
            RestaurantDetailService.countMissingBooking(restaurantId).then(function (response) {
                vm.countMissingBookingDetails = response;
            }, function (error) {

            });
        }


        currentRequests($stateParams.restaurantId, $filter('date')(new Date(), 'yyyy-MM-dd HH:mm:ss'));
        function currentRequests(restaurantId, serve_at) {
            vm.reqLoading = true;
            vm.isRequestEmpty = true;
            RestaurantDetailService.currentRequests(restaurantId, serve_at).then(function (response) {
                vm.isRequestEmpty = false;
                vm.getRequestsMeal = response;
                vm.reqLoading = false;
                if (response == 'Meal Request Not Found') {
                    vm.isRequestEmpty = true;
                }
            }, function (error) {

                vm.reqLoading = false;
                vm.isRequestEmpty = true;
            });
        }

        function closeModal() {
            $("#upload_modal").modal("hide");
            uploader.clearQueue();
        }

        $scope.getSingleMealPrice = function(price,x_number)
        {
            if ( price ) {
                price = parseFloat(price)/parseFloat(x_number); 
            }
            else{
                price = price;
            }
            return price.toFixed(2);
        }

        vm.ddMenuOptions = [
            {
                text: $filter('translate')('UPLOAD_IMAGE.SELECT_IMAGE'),
                iconCls: 'someicon'
            },
            {
                divider: true
            },
            {
                text: $filter('translate')('UPLOAD_IMAGE.DELETE_IMAGE'),
                iconCls: 'someicon'
            }
        ];

        vm.ddMenuSelected = {};
        vm.selectedMenulist = null;
        vm.isClient = false;

        if ($rootScope.currentUser) {
            if ($rootScope.currentUser.profile_type != 'client') {
                RestaurantDetailService.confirmSelf($stateParams.restaurantId).then(function (response) {

                    if (response.error == 'success') {
                        vm.isClient = true;
                    } else {
                        vm.isClient = false;
                    }
                }, function (error) {


                    vm.isClient = false;
                });
            }
        }

        vm.onDropDownMenuSelect = function (selected, ml) {
            if (selected.text === $filter('translate')('UPLOAD_IMAGE.SELECT_IMAGE')) {
                vm.selectedMenulist = ml;
                $("#upload_modal").modal();

            } else if (selected.text === $filter('translate')('UPLOAD_IMAGE.DELETE_IMAGE')) {
                // delete logic
                vm.selectedMenulist = ml;
                deleteFoodImage();
            }
        }

        vm.openCalendar = function () {

            vm.date_picker.open = true;
        };

        vm.date_picker = {
            date: moment().add(1, 'hours').toDate(),
            datepickerOptions: {
                showWeeks: false,
                minDate: new Date(),
                startingDay: 1

            }
        };

        $scope.$watch("vm.searchParams.currentPosition", function () {
            if (vm.searchParams.currentPosition && vm.searchParams.currentPosition.geometry) {
                vm.location_not_choosen = "";
            }
        });

        vm.searchParams = {
            "searchToggle": true,
            "filter_by_date": false,
            "time": new Date(),
            "position": {
                "latitude": "",
                "longitude": ""
            },
            "price": {
                "min": 0,
                "max": 1000
            },
            "date": moment().add(1, 'hours').toDate(),
            "menuListSearchKeyword": "",
            "restaurantSearchKeyword": "",
            "distance": '10'
        };
        // Price Slider

        $translate(['SEARCH.MIN PRICE', 'SEARCH.MAX PRICE']).then(function(results) {
            var minPrice = results['SEARCH.MIN PRICE'];
            var maxPrice = results['SEARCH.MAX PRICE']
            vm.priceSlider = {
                min: 0,
                max: 1000,
                options: {
                    floor: 0,
                    ceil: 1000,
                    translate: function (value, sliderId, label) {
                        switch (label) {
                            case 'model':
                                return '<b>' + minPrice + '</b> ' + value;
                            case 'high':
                                return '<b>' + maxPrice + '</b> ' + value;
                            default:
                                return value;
                        }
                    }
                }
            };
        });

        getSearchFromLocalStorage();
        getRestaurantDetail();
        getMenuTypes();

        function restInit() {
            if (localStorage.getItem('menuGroup')) {
                var menuGroup = JSON.parse(localStorage.getItem('menuGroup'));

            }
        }

        function switchToMenuType(menuType) {
            vm.currentMenuType = menuType;
            getMenuGroups(vm.currentMenuType.id, vm.restaurant.id, vm.currentMenuType);

        }

        function setMenuTypeAndGroupIds() {
            getMenuOfTheDayFromLocalStorage();
            var menu_list = $stateParams.menuList;

            if (menu_list) {
                vm.currentMenuTypeId = menu_list.menu_type_id;
                vm.currentGroupId = menu_list.menu_group_id;
                localStorage.setItem('menuOfTheDay', false);
                setMenuGroupOnLocalStorage();
            } else {
                var menuGroup = getMenuGroupFromLocalStorage(vm.restaurantId);
                if (menuGroup) {
                    vm.currentMenuTypeId = menuGroup.menuTypeId;
                    vm.currentGroupId = menuGroup.menuGroupId;
                }
            }

            getMenuOfTheDay();

        }

        function setMenuOfTheDay() {
            vm.isMenuOfTheDay = true;
            localStorage.setItem("menuOfTheDay", true);
            getMenuOfTheDay();

            var searchParamsdate = $filter('date')(new Date(vm.searchParams.date), 'yyyy-MM-dd HH:mm:ss');
            currentRequests($stateParams.restaurantId, searchParamsdate);
            countMissingBooking($stateParams.restaurantId);
        }

        function setMenuGroupOnLocalStorage() {

            var menuGroup = {
                "menuGroupId": vm.currentGroupId,
                "menuTypeId": vm.currentMenuTypeId,
                "restaurantId": vm.restaurantId
            };
            localStorage.setItem("menuGroup", JSON.stringify(menuGroup));
        }

        function getMenuOfTheDayFromLocalStorage() {
            if (localStorage.getItem('menuOfTheDay')) {

                var menu_list = $stateParams.menuList;
                if (!menu_list) {
                    vm.isMenuOfTheDay = JSON.parse(localStorage.getItem('menuOfTheDay'));
                    return vm.isMenuOfTheDay;
                }
            }
            return false;
        }

        function setCurrentMenuGroup(group) {
            vm.isMenuOfTheDay = false;
            vm.currentGroup = group;
            vm.currentGroupId = group.id;
            vm.currentMenuTypeId = group.ID_menu_type;
            setMenuGroupOnLocalStorage();
            localStorage.setItem("menuOfTheDay", false);

        }

        function widgetscript() {
            var show = getURLParameter('showtype');
            var menulist_rectangle = getURLParameter('menulist_rectangle');
            var menudir = getURLParameter('menudirection');

            $(document).ready(function () {
                /* function dropwindows() {
                 {
                 if (dropwindow == "off") {
                 jQuery('.widget__menutype').each(function () {
                 if (jQuery(this).next('.list-group-child').hasClass('in')) {
                 jQuery(this).trigger('click')
                 }
                 }
                 )
                 }
                 else {
                 jQuery('.widget__menutype').each(function () {
                 if (!jQuery(this).next('.list-group-child').hasClass('in')) {
                 jQuery(this).trigger('click')
                 }
                 }
                 )
                 }

                 }
                 } *///all windows open

                /* function windowdirection() {
                 {
                 {
                 if(show =="on"){
                 alert('Sorry , you can\'t use showtype and window_direction in one time');
                 }
                 else{
                 if (windowdirections == "up") {
                 console.log('bav');
                 $('.widget__dropmenu').each(function(i, content) {
                 $(content).insertBefore($(content).prev());
                 });
                 }}
                 }
                 }};

                 windowdirection();
                 */
            });//---dropdown windows activation

            $(document).ready(function () {
                function showtypes() {
                    {
                        if (show == "off") {
                            jQuery('.widget__menutype').each(function () {
                                    if (!jQuery(this).next('.list-group-child').hasClass('in')) {
                                        jQuery(this).trigger('click')
                                    }
                                }
                            )
                            jQuery('.widget__menutype').css("display", "none");
                        }
                        else {
                            jQuery('.widget__menutype').css("display", "block");

                        }
                    }
                }

                showtypes();
            });//---show sub_menus without main_menus

            $(document).ready(function () {
                function menu_up() {

                    if (menudir == "up") {
                        jQuery('.widget__menu').removeClass("col-md-3").addClass("col-md-12");
                        jQuery('.widget__arrow').removeClass("pull-left").addClass("pull-right");
                        jQuery('.widget__fullmenu').removeClass("col-md-12").addClass("col-md-8 vcenter").css("padding", "0px");
                        jQuery('.widget__list').removeClass("col-md-9").addClass("col-md-12");
                        jQuery('.widget__container').addClass("col-md-6").css("padding", "0px");
                        jQuery('.widget__menuday').addClass("col-md-4 vcenter");
                        jQuery('.widget__dateinput').removeClass("col-lg-12").addClass("col-md-6 vcenter").css("padding", "0px");
                        jQuery('.widget__menubutton').removeClass("pull-right").addClass("col-md-6 vcenter").css({
                            "margin": "0px",
                            "padding": "0px"
                        });

                    }
                    else if (menudir == "right") {
                        jQuery('.widget__container').css("text-align", "left");

                    }

                }

                menu_up();
            });//---change nav menu position

            $(document).ready(function () {
                function menurect() {
                    console.log('heh');
                    if (menulist_rectangle == "off") {

                        jQuery('.widget__groupbook').css("margin-bottom", "0px");
                        jQuery('.widget__bookbutton').css("margin-top", "0px");
                        jQuery('.widget__menulist').css("margin", "0px");
                        jQuery('.widget__menutitle').css({"margin-bottom": "0px", "border": "none"});
                    }
                    else {
                        jQuery('.widget__groupbook').css("margin-bottom", "15px");
                        jQuery('.widget__bookbutton').css("margin-top", "20px");
                        jQuery('.widget__menulist').css("margin", "18px");
                        jQuery('.widget__menutitle').css({"margin-bottom": "20px", "border": "1px solid #ddd"});
                    }
                }

                setTimeout(menurect, 500);//
                menurect();
            });//---menu_rect on/off without margin
        }


        function getMenuTypes() {

            vm.menuOfTheDayLoading = true;

            RestaurantDetailService.getMenuTypes(vm.restaurantId).then(function (response) {


                vm.menuTypes = response.data;
                angular.forEach(vm.menuTypes, function (type) {
                    if (type.menu_groups && type.menu_groups) {
                        angular.forEach(type.menu_groups, function (menu_group) {
                            if (menu_group.menu_subgroups && menu_group.menu_subgroups) {
                                angular.forEach(menu_group.menu_subgroups, function (item) {
                                    if (item.menu_lists && item.menu_lists) {
                                        angular.forEach(item.menu_lists, function (menu) {
                                            if (menu.photo) {
                                                menu.photo = appConstant.imagePath + menu.photo;
                                            }
                                            else {
                                                menu.photo = "assets/images/meal-placeholder.png";
                                            }
                                        });
                                    }

                                });
                            }
                        });
                    }
                });

                vm.menuOfTheDayLoading = false;
                buildMenu();
                setMenuTypeAndGroupIds();

                // widgetscript();

            }, function (error) {
                vm.menuOfTheDayLoading = false;
            });
        }

        function buildMenu() {
            angular.forEach(vm.menuTypes, function (menuType) {
                if (menuType.id == vm.currentMenuTypeId) {
                    menuType.collapse = false;
                    angular.forEach(menuType.menu_groups, function (menuGroup) {
                        if (menuGroup.id == vm.currentGroupId) {
                            vm.currentGroup = menuGroup;

                        }
                    });
                }
            });
        }

        function timed(time1, time2) {
            //
            if (time1.match(/^[0-9]{4}$/g) && time2.match(/^[0-9]{4}$/g)) {
                //lets calculate the difference. But values consist of four digits.
                var time1Seconds = toSeconds(time1.substr(0, 2), time1.substr(2));
                var time2Seconds = toSeconds(time2.substr(0, 2), time2.substr(2));

                if (!time1Seconds || !time2Seconds) {
                    //input is not correct.
                    return false;
                }

                var difference = time1Seconds - time2Seconds;
                if (difference < 0) {
                    return false;
                }

                return true;
            }
        }

        function toSeconds(hours, minutes) {
            var seconds = 0;
            if ((hours >= 0 && hours <= 24) && (minutes >= 0 && minutes < 60)) {
                seconds += (parseInt(hours) * 3600) + (parseInt(minutes) * 60);
                return seconds
            }
            else {
                return false;
            }

        }

        function checkTImeInterval(startTime, endTime) {
            var currentDate = new Date();
            var startDate = new Date(currentDate.getTime());
            startDate.setHours(startTime.split(":")[0]);
            startDate.setMinutes(startTime.split(":")[1]);
            startDate.setSeconds(startTime.split(":")[2]);

            var endDate = new Date(currentDate.getTime());
            endDate.setHours(endTime.split(":")[0]);
            endDate.setMinutes(endTime.split(":")[1]);
            endDate.setSeconds(endTime.split(":")[2]);

            var r_open = startDate < currentDate && endDate > currentDate;
            var show_h = currentDate <= startDate || r_open;


            return {'r_open': r_open, 'show_h': show_h};

        }

        vm.photos = [];

        function getRestaurantDetail() {
            RestaurantDetailService.getRestaurantDetail(vm.restaurantId, vm.type).then(function (response) {

                if (response && response.data) {
                    vm.restaurant = response.data;

                    var week_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saterday', 'sunday'];
                    var week_day_index = new Date().getDay() - 1;
                    week_day_index = week_day_index >= 0 ? week_day_index : 6;

                    var dt = new Date();
                    var time = dt.getHours() + ":" + (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes();

                    vm.timeLog = [];
                    vm.restaurant.openingHours.datanew = [];

                    console.log(vm.restaurant.openingHours.data[0]);
                    angular.forEach(vm.restaurant.openingHours.data, function (value, key) {

                        if (isNaN(parseInt(value.a_starting_time))) {
                            value.a_starting_time = '';
                        }

                        if (isNaN(parseInt(value.a_ending_time))) {
                            value.a_ending_time = '';
                        }

                        if (isNaN(parseInt(value.m_starting_time))) {
                            value.m_starting_time = '';
                        }

                        if (isNaN(parseInt(value.m_ending_time))) {
                            value.m_ending_time = '';
                        }

                        if (value.date == week_days[week_day_index]) {
                            vm.m_time = true;
                            vm.a_time = true;
                            vm.t_m_time = true;
                            vm.t_a_time = true;
                            vm.r_open = false;

                            vm.a_starting_time = value.a_starting_time;
                            vm.a_ending_time = value.a_ending_time;
                            vm.m_starting_time = value.m_starting_time;
                            vm.m_ending_time = value.m_ending_time;

                            if (vm.a_starting_time.replace(/\D/g, '').length == 0 && vm.a_ending_time.replace(/\D/g, '').length == 0) {
                                vm.a_time = false;
                            } else {
                                vm.r_open_a = checkTImeInterval(vm.a_starting_time + ':00', vm.a_ending_time + ':00').r_open;
                                vm.a_time = checkTImeInterval(vm.a_starting_time + ':00', vm.a_ending_time + ':00').show_h;
                            }

                            if (vm.m_starting_time.replace(/\D/g, '').length == 0 && vm.m_ending_time.replace(/\D/g, '').length == 0) {
                                vm.m_time = false;
                            } else {
                                vm.r_open_m = checkTImeInterval(vm.m_starting_time + ':00', vm.m_ending_time + ':00').r_open;
                                vm.m_time = checkTImeInterval(vm.m_starting_time + ':00', vm.m_ending_time + ':00').show_h;
                            }

                            if (vm.r_open_a || vm.r_open_m) {
                                vm.r_open = true;
                            }

                            var afterKey = key + 1;

                            if (afterKey == 7) {
                                afterKey = 0;
                            }

                            vm.t_a_starting_time = vm.restaurant.openingHours.data[afterKey].a_starting_time;
                            vm.t_a_ending_time = vm.restaurant.openingHours.data[afterKey].a_ending_time;
                            vm.t_m_starting_time = vm.restaurant.openingHours.data[afterKey].m_starting_time;
                            vm.t_m_ending_time = vm.restaurant.openingHours.data[afterKey].m_ending_time;

                            if (vm.t_m_starting_time.replace(/\D/g, '').length == 0 && vm.t_m_ending_time.replace(/\D/g, '').length == 0) {
                                vm.t_m_time = false;
                            }

                            if (vm.t_a_starting_time.replace(/\D/g, '').length == 0 && vm.t_a_ending_time.replace(/\D/g, '').length == 0) {
                                vm.t_a_time = false;
                            }

                            this.push(value);
                            this.push(vm.restaurant.openingHours.data[key + 1]);
                        }

                        vm.restaurant.openingHours.datanew.push(value);
                    }, vm.timeLog);

                    console.log(vm.restaurant.openingHours.datanew);


                    vm.photos = [];
                    angular.forEach(response.data.photos.data, function (value, key) {
                        vm.photos.push(appConstant.imagePath + value.original_photo_path);
                    });
                }
            }, function (error) {

            })
        }

        function getMenuGroupFromLocalStorage(restaurantId) {
            if (localStorage.getItem('menuGroup')) {
                var menuGroup = JSON.parse(localStorage.getItem('menuGroup'));
                if (menuGroup.restaurantId == restaurantId) {
                    return menuGroup;
                }
            }
            return false;
        }

        function changeFirstPic(photoIndex) {

            var firstPic = vm.firstPhoto;
            vm.firstPhoto = vm.photos[photoIndex];
        }

        function addMenuListToCart(item) {
            console.log(vm.restaurant);
            var currency = item.currency;
            var id_menu_list = item.ID_menu_list;
            var req = {
                "id": id_menu_list,
                "currency": currency
            };
            RestaurantDetailService.getMenuList(req).then(function (response) {
                var data = response.data;
                console.log(data);
                client_percentage = parseFloat(data.menuList[0].client_percentage ? data.menuList[0].client_percentage : 0);
                commision_split = parseFloat(data.setting[0].commission_split ? data.setting[0].commission_split : 0);

                if (!$rootScope.currentUser) {
                    $state.go("main.login");
                    return;
                }
                item.loading = true;

                if (vm.restaurant.currency == item.currency) {
                    vm.client_commission = item.price * client_percentage * commision_split / 100 / 100;
                    vm.member_commission = item.price * client_percentage * (1 - commision_split / 100) / 100;
                } else {
                    vm.client_commission = null;
                    vm.member_commission = null;
                }
                var data = {
                    "orders_detail": {
                        "ID_restaurant": item.ID_restaurant,
                        "ID_menu_list": item.ID_menu_list,
                        "t_price": item.price,
                        "date": vm.searchParams.date,
                        "time": undefined,
                        "client_commission": vm.client_commission,
                        "member_commission": vm.member_commission
                    },
                    "lang": "en",
                    "source": "detail"
                };
                if (localStorage.getItem('search')) {
                    var searchParams = JSON.parse(localStorage.getItem('search'));
                    searchParams.time = vm.searchParams.date;
                    searchParams.date = vm.searchParams.date;
                    localStorage.setItem('search', JSON.stringify(searchParams));
                }
                RestaurantDetailService.addMenuListToCart(data).then(function (response) {
                    if (response.latest == '1') {
                        var msg = $translate.instant("CLIENT.CANNOT ADD BOOKING MESSAGE") + response.booking_latest;
                        alert(msg);
                        item.loading = false;
                        return;
                    }

                    $rootScope.$broadcast('orders-detail-changed');
                    item.loading = false;
                    item.ordered = Number(item.ordered);
                    item.ordered += Number(response.data.x_number);

                }, function (error) {

                    item.loading = false;
                });
            }, function (error) {
                console.log(error);

            });
        }

        function getSearchFromLocalStorage() {
            if (localStorage.getItem('search')) {

                vm.searchParams = JSON.parse(localStorage.getItem('search'));
                vm.searchParams.time = new Date(vm.searchParams.time);
                vm.searchParams.date = new Date(vm.searchParams.date);
                vm.searchParams.date.setHours(vm.searchParams.time.getHours(), vm.searchParams.time.getMinutes());
            }
        }


        function search(isValid) {

            if (isValid) {
                if ((vm.searchParams.positionKeyword != vm.searchParams.currentPosition) && !vm.searchParams.currentPosition.geometry) {
                    vm.location_not_choosen = "SEARCH.LOCATION NOT CHOSEN";
                    return;
                }

                if (vm.searchParams.searchToggle) {
                    vm.searchParams.keyword = vm.searchParams.menuListSearchKeyword;
                } else {
                    vm.searchParams.keyword = vm.searchParams.restaurantSearchKeyword;
                }
                if (!vm.searchParams.position || !vm.searchParams.position.latitude) {
                    vm.searchParams.position = vm.searchParams.currentPosition;
                }

                $state.go("main.search", {"search": vm.searchParams});
            }
        }

        $('#rest_location').on('shown.bs.modal', function () {

            $('#map_holder').locationpicker({
                location: {latitude: vm.restaurant.latitude, longitude: vm.restaurant.longitude},
                radius: 300,
                zoom: 15,
                markerDraggable: false
            });
        });

        function getMenuOfTheDay() {
            vm.menuOfTheDayLoading = true;
            RestaurantDetailService.getMenuOfTheDay(vm.restaurantId, vm.searchParams.date, vm.searchParams.time).then(function (response) {
                vm.menuOfTheDay = response.data;

                if (!vm.currentGroupId && !vm.currentMenuTypeId && vm.menuOfTheDay.length == 0) {
                    if (vm.menuTypes.length) {

                        vm.currentMenuTypeId = vm.menuTypes[0].id;
                        if (vm.menuTypes[0].menu_groups.length) {

                            vm.currentGroupId = vm.menuTypes[0].menu_groups[0].id;
                            buildMenu();
                        }
                    }
                }
                if (vm.menuOfTheDay.length > 0) {
                    if (!vm.currentGroupId && !vm.currentMenuTypeId) {
                        vm.isMenuOfTheDay = true;
                    }
                    angular.forEach(vm.menuOfTheDay, function (menu) {
                        if (menu.photo)
                            menu.photo = appConstant.imagePath + menu.photo;
                        else
                            menu.photo = "assets/images/meal-placeholder.png";
                    });
                }
                vm.menuOfTheDayLoading = false;
            }, function (error) {
                vm.menuOfTheDayLoading = false;
            });
        }

        var uploader = $scope.uploader = new FileUploader({
            url: 'app/public/dialog/upload.php'
        });

        uploader.filters.push({
            name: 'imageFilter',
            fn: function (item /*{File|FileLikeObject}*/, options) {
                var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
            }
        });

        // CALLBACKS

        /**
         * Show preview with cropping
         */

        uploader.onAfterAddingFile = function (item) {
            // $scope.croppedImage = '';

            if (uploader.queue.length == 2) {
                uploader.removeFromQueue(0);
            }
            item.croppedImage = '';
            var reader = new FileReader();
            reader.onload = function (event) {
                var img = new Image();
                img.src = event.target.result;

                if (img.width < 400 || img.height < 300) {
                    uploader.clearQueue();
                    alert("Image must not be smaller than 400x300");
                }

                $scope.$apply(function () {
                    item.image = event.target.result;
                });
            };
            reader.readAsDataURL(item._file);

        };

        vm.cropImage = function (item) {

            if (!item.croppedImage) {

            } else {
                var file = dataURItoBlob(item.croppedImage);
                file.name = item._file.name;

                vm.setFoodImage(file);

            }

        }
        vm.removeUploadImg = function () {

            uploader.queue = [];
        };
        function setFoodImage(file) {


            if (file) {
                var idImgInfo = [vm.selectedMenulist.ID_menu_list, vm.selectedMenulist.ID_restaurant];

                RestaurantDetailService.setFoodImage(file, idImgInfo).then(function (response) {

                    closeModal();
                    vm.selectedMenulist.photo = appConstant.imagePath + "uploads/items/" + response.menu_list.photo;
                    alert("Photo Upload Success!");
                    getMenuTypes();

                }, function (error) {

                    alert("Error uploading your file! Please try again!");
                    console.log("Error uploading your file! Please try again!");
                });

            } else {


            }
        }

        function deleteFoodImage() {
            RestaurantDetailService.deleteFoodImage(vm.selectedMenulist.ID_menu_list).then(function (response) {

                vm.selectedMenulist.photo = "assets/images/meal-placeholder.png";
                alert("Delete Photo  Success!");
                vm.modalShown = false;
            }, function (error) {

                console.log("Error deleting your file! Please try again!");
            });
        }

        function uploadFile(file) {

            if (file) {


                ProfileService.uploadFile(file, $stateParams.restaurantId, item_type).then(function (response) {

                    getRestaurant();
                    clear();

                }, function (error) {

                    vm.server_error = "Error uploading your file! Please try again!";
                    clear();
                    $rootScope.pic1 = false;
                    $rootScope.pic2 = false;
                    $rootScope.pic3 = false;
                });

            }
        }


        /**
         * Upload Blob (cropped image) instead of file.
         * @see
         *   https://developer.mozilla.org/en-US/docs/Web/API/FormData
         *   https://github.com/nervgh/angular-file-upload/issues/208
         */
        uploader.onBeforeUploadItem = function (item) {
            var blob = dataURItoBlob(item.croppedImage);
            item._file = blob;
        };

        /**
         * Converts data uri to Blob. Necessary for uploading.
         * @see
         *   http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
         * @param  {String} dataURI
         * @return {Blob}
         */
        var dataURItoBlob = function (dataURI) {
            var binary = atob(dataURI.split(',')[1]);
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
            var array = [];
            for (var i = 0; i < binary.length; i++) {
                array.push(binary.charCodeAt(i));
            }
            return new Blob([new Uint8Array(array)], {type: mimeString});
        };

        uploader.onWhenAddingFileFailed = function (item /*{File|FileLikeObject}*/, filter, options) {
            console.info('onWhenAddingFileFailed', item, filter, options);
        };
        uploader.onAfterAddingAll = function (addedFileItems) {
            console.info('onAfterAddingAll', addedFileItems);
        };
        uploader.onProgressItem = function (fileItem, progress) {
            console.info('onProgressItem', fileItem, progress);
        };
        uploader.onProgressAll = function (progress) {
            console.info('onProgressAll', progress);
        };
        uploader.onSuccessItem = function (fileItem, response, status, headers) {
            console.info('onSuccessItem', fileItem, response, status, headers);
        };
        uploader.onErrorItem = function (fileItem, response, status, headers) {
            console.info('onErrorItem', fileItem, response, status, headers);
        };
        uploader.onCancelItem = function (fileItem, response, status, headers) {
            console.info('onCancelItem', fileItem, response, status, headers);
        };
        uploader.onCompleteItem = function (fileItem, response, status, headers) {
            console.info('onCompleteItem', fileItem, response, status, headers);
        };
        uploader.onCompleteAll = function () {
            console.info('onCompleteAll');
        };

        console.info('uploader', uploader);

        $scope.bookingAvailable = function(menuList) {

            var date = new Date(vm.searchParams.date);
            var today = new Date();

            var time;
            time = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ":" + (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds());

            if (menuList.book_latest) {
                if (date.toLocaleDateString() == today.toLocaleDateString()) {
                    if (menuList.book_latest < time) {
                        return false;
                    }
                }
            }
            if (menuList.time_from > time) {
                return false;
            }
            if (menuList.time_to < time && menuList.time_to > menuList.time_from) {
                return false;
            }
            if (menuList.is_day_menu && menuList.is_day_menu > 0) {
                if ( date.getDay() % 7 != menuList.is_day_menu) {
                    return false;
                }
            }
            return true;
        }
    }


})();
