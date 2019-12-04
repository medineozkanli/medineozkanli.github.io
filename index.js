//var apiUrl = "http://localhost:63151/";
var apiUrl = "https://inoteapi.kod.fun/";
var app = angular.module("myApp", ["ngRoute"]);



app.controller("indexCtrl", function ($scope, $window, $http, $location) {

    $scope.token = function () {
        if ($window.sessionStorage.token) {
            return $window.sessionStorage.token;
        }
        if ($window.localStorage.token) {
            return $window.localStorage.token;
        }
        return null;
    };

    $scope.requestConfig = function () { //hepsinde ortak şeyleri burdan aldık.
        return {
            headers: {
                Authorization: "Bearer " + $scope.token()
            }
        }
    };

    $scope.checkAuthentication = function () {

        // giriş yapıldı mı?
        if (!$scope.token()) {
            $scope.isAuthenticated = false;
            $scope.loggedInUserEmail = null;
            return false;
        }

        $http.get(apiUrl + "api/Account/UserInfo", $scope.requestConfig()).then(
            function (response) {
                $scope.loggedInUserEmail = response.data.Email;
                $scope.isAuthenticated = true;
            },
            function (response) {
                $scope.isAuthenticated = false;
                $scope.loggedInUserEmail = null;
            }
        );
    };

    $scope.setLoggedInUser = function (email) {
        if (email) {
            $scope.isAuthenticated = true;
            $scope.loggedInUserEmail = email;
        }
        else {
            $scope.isAuthenticated = false;
            $scope.loggedInUserEmail = null;
        }
    };

    $scope.logout = function (e) {
        e.preventDefault()
        $scope.setLoggedInUser(null);

        $http.post(apiUrl + "api/Account/Logout", null, $scope.requestConfig()).then(
            function (response) {

            }
        );
        $window.sessionStorage.removeItem("token");
        $window.localStorage.removeItem("token");
        $location.path("login");
    };

    $scope.checkAuthentication();
});


app.config(function ($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "Pages/Main.html",
            controller: "mainCtrl"
        })
        .when("/login", {
            templateUrl: "Pages/Login.html",
            controller: "loginCtrl"
        })
        .when("/register", {
            templateUrl: "Pages/Register.html",
            controller: "registerCtrl"
        });
});

app.controller("mainCtrl", function ($scope, $http, $window, $location) {

    if (!$scope.token()) {
        $location.path("login");
        return;
    }
    $scope.selectedNote = null;
    $scope.activeNote = { //ng model ile bizim bunları textbox ve areamıza bağlamamız lazım
        Id: 0,
        Title: "",
        Content: ""
    };
    $scope.isLoading = true;
    $scope.notes = [];


    $scope.loadNotes = function () {
        $http.get(apiUrl + "api/Notes/GetNotes", $scope.requestConfig()).then(
            function (response) {
                $scope.notes = response.data;
                $scope.isLoading = false;
            },
            function (response) { //başarısızsa logine at.
                if (response.status == 401) {
                    $location.path("login");
                }
            }
        );
    };

    $scope.newNote = function (e) {
        if (e) {
            e.preventDefault();
        }
        $scope.selectedNote = null;
        $scope.activeNote = {
            Id: 0,
            Title: "",
            Content: ""
        };
    };


    $scope.showNote = function (e, note) {
        if (e) {
            e.preventDefault();
        }
        $scope.activeNote = angular.copy(note); //kopyasını aldıkki anlık değişmesin diye
        $scope.selectedNote = note;

    };
    $scope.saveNote = function (e) {
        if ($scope.activeNote.Id !== 0) { // tür eşit mi diye bakıyo
            $http.put(apiUrl + "api/Notes/PutNote/" + $scope.activeNote.Id, $scope.activeNote, $scope.requestConfig()).then(
                function (response) {
                    console.log(response.data);
                    $scope.selectedNote.Title = response.data.Title;
                    $scope.selectedNote.Content = response.data.Content;
                    $scope.selectedNote.ModifiedTime = response.data.ModifiedTime;
                },
                function (response) {

                },
            );
        }
        else {
            $http.post(apiUrl + "api/Notes/PostNote", $scope.activeNote, $scope.requestConfig()).then(
                function (response) {
                    $scope.notes.push(response.data);
                    $scope.showNote(null, response.data);
                },
                function (response) {

                },
            );
        }
    };
    $scope.deleteNote = function (e) {
        e.preventDefault();

        if ($scope.selectedNote) {
            $http.delete(apiUrl + "api/Notes/DeleteNote/" + $scope.selectedNote.Id, $scope.requestConfig()).then(
                function (response) {
                    var i = $scope.notes.indexOf($scope.selectedNote);
                    $scope.notes.splice(i, 1);
                    $scope.newNote();
                },
                function (response) {

                },
            );
        }

    };
    $scope.noteActiveClass = function (id) {
        if ($scope.selectedNote == null) {
            return "";
        }
        return $scope.selectedNote.Id == id ? "active" : "";
    };
    $scope.loadNotes();
});

app.controller("loginCtrl", function ($scope, $http, $location, $timeout, $httpParamSerializer, $window) {
    $scope.errors = [];
    $scope.successMessage = "";

    $scope.hasErrors = function () {
        return $scope.errors.length > 0;
    };

    $scope.user = {
        grant_type: "password",
        username: "",
        password: ""
    };

    $scope.isRememberMe = false;

    $scope.login = function (e) {
        e.preventDefault();

        $scope.errors = [];
        $scope.successMessage = "";

        $http.post(apiUrl + "Token", $httpParamSerializer($scope.user)).then(
            function (response) { // başarı durumunda
                var token = response.data.access_token;

                // varsa önce mevcut tokenları temizle
                if ($window.localStorage.token)
                    $window.localStorage.removeItem("token");
                if ($window.sessionStorage.token)
                    $window.sessionStorage.removeItem("token");

                if ($scope.isRememberMe) {
                    $window.localStorage.token = token;
                }
                else {
                    $window.sessionStorage.token = token;
                }

                $scope.setLoggedInUser($scope.user.username);

                $scope.successMessage = "Başarıyla giriş yaptınız. Şimdi uygulamaya yönlendiriliyorsunuz..";

                $timeout(function () {
                    $location.path("/");
                }, 1000);
            },
            function (response) { // hata durumunda
                if (response.data.error_description) {
                    $scope.errors.push(response.data.error_description);
                }
            });
    };
});

app.controller("registerCtrl", function ($scope, $http) {
    $scope.errors = [];
    $scope.successMessage = "";

    $scope.user = {
        Email: "",
        Password: "",
        ConfirmPassword: ""

    };

    $scope.register = function (e) {
        $scope.errors = [];//daha en başında ondan hatası yok
        e.preventDefault();
        $http.post(apiUrl + "api/Account/Register", $scope.user)
            .then(function (response) {//başarı durumunda hen çalışır
                $scope.user = {
                    Email: "",
                    Password: "",
                    ConfirmPassword: ""
                };
                $scope.successMessage = "Kayıt başarılı. Şimdi giriş sayfasından giriş yapabilirisiniz.";
            }, function (response) {
                $scope.errors = getErrors(response.data.ModelState);
            });
    };

    $scope.hasErrors = function () {
        return $scope.errors.length > 0;//dizide eleman varsa
    }

});
function getErrors(modelState) {
    var errors = [];

    for (var key in modelState) {
        for (var i = 0; i < modelState[key].length; i++) {
            errors.push(modelState[key][i]);

            if (modelState[key][i].includes("zaten alınmış.")) {
                break;
            }
        }
    }

    return errors;
}