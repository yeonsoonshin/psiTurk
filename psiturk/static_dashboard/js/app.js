// Generated by CoffeeScript 1.6.1
(function() {
  define([ "jquery", "underscore", "backbone", "router", "models/ConfigModel", "models/AtAGlanceModel", "views/SidebarView", "views/ContentView", "text!templates/overview.html", "text!templates/sidebar.html", "views/HITView", "models/HITModel", "collections/HITCollection", "views/RunExptView" ], function($, _, Backbone, Router, ConfigModel, AtAGlanceModel, SidebarView, ContentView, OverviewTemplate, SideBarTemplate, HITView, HIT, HITs, RunExptView) {
    return {
      events: {
        "click a": "pushstateClick",
        "click li": "pushstateClick"
      },
      pushstateClick: function(event) {
        return event.preventDefault();
      },
      getCredentials: function() {
        var _this = this;
        $("#aws-info-modal").modal("show");
        return $(".save").click(function(event) {
          event.preventDefault();
          _this.save(event);
          return $("#aws-info-modal").modal("hide");
        });
      },
      verifyAWSLogin: function() {
        var config, configPromise, _this = this;
        config = new ConfigModel;
        configPromise = config.fetch();
        return configPromise.done(function() {
          var inputData, key_id, secret_key;
          key_id = config.get("AWS Access").aws_access_key_id;
          secret_key = config.get("AWS Access").aws_secret_access_key;
          inputData = {};
          inputData.aws_access_key_id = key_id;
          inputData.aws_secret_access_key = secret_key;
          return $.ajax({
            url: "/verify_aws_login",
            type: "POST",
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(inputData),
            success: function(response) {
              if (response.aws_accnt === "False") return _this.getCredentials();
            },
            error: function() {
              return console.log("aws verification failed");
            }
          });
        });
      },
      getExperimentStatus: function() {
        return $.ajax({
          url: "/get_hits",
          type: "GET",
          success: function(data) {
            if (data.hits.length > 0) {
              $("#experiment_status").css({
                color: "green"
              });
              return $("#run").css({
                color: "grey"
              });
            }
            $("#experiment_status").css({
              color: "grey"
            });
            return $("#run").css({
              color: "orange"
            });
          }
        });
      },
      save: function(event) {
        var configData, configPromise, inputData, section, _this = this;
        event.preventDefault();
        section = $(event.target).data("section");
        inputData = {};
        configData = {};
        $.each($("#myform").serializeArray(), function(i, field) {
          return inputData[field.name] = field.value;
        });
        configData[section] = inputData;
        this.config = new ConfigModel;
        configPromise = this.config.fetch();
        return configPromise.done(function() {
          return _this.config.save(configData, {
            complete: function() {
              return _this.verifyAWSLogin();
            }
          });
        });
      },
      initialize: function() {
        var atAGlancePromise, contentView, updateExperimentStatus, _this = this;
        Router.initialize();
        this.verifyAWSLogin();
        $("#server_on").on("click", function() {
          return $("#server_status").css({
            color: "yellow"
          });
        });
        $(function() {
          var socket;
          socket = io.connect("/server_status");
          socket.on("connect", function() {
            return $.ajax({
              url: "/monitor_server"
            });
          });
          return socket.on("status", function(data) {
            if (parseInt(data) === 0) {
              $("#server_status").css({
                color: "green"
              });
              $("#server_on").css({
                color: "grey"
              });
              return $("#server_off").css({
                color: "orange"
              });
            }
            $("#server_status").css({
              color: "red"
            });
            $("#server_off").css({
              color: "grey"
            });
            return $("#server_on").css({
              color: "orange"
            });
          });
        });
        this.ataglance = new AtAGlanceModel;
        atAGlancePromise = this.ataglance.fetch();
        atAGlancePromise.done(function() {
          var configPromise;
          _this.config = new ConfigModel;
          configPromise = _this.config.fetch();
          return configPromise.done(function() {
            var overview, sideBarHTML, sidebarView;
            overview = _.template(OverviewTemplate, {
              input: {
                balance: _this.ataglance.get("balance"),
                debug: _this.config.get("Server Parameters").debug === "True" ? "checked" : "",
                using_sandbox: _this.config.get("HIT Configuration").using_sandbox === "True" ? "checked" : ""
              }
            });
            $("#content").html(overview);
            sideBarHTML = _.template(SideBarTemplate);
            $("#sidebar").html(sideBarHTML);
            return sidebarView = new SidebarView({
              config: _this.config,
              ataglance: _this.ataglance
            });
          });
        });
        contentView = new ContentView;
        contentView.initialize();
        updateExperimentStatus = _.bind(this.getExperimentStatus, this);
        $("#run").on("click", function() {
          var configPromise, _this = this;
          this.config = new ConfigModel;
          configPromise = this.config.fetch();
          return configPromise.done(function() {
            var runExptView;
            runExptView = new RunExptView({
              config: _this.config
            });
            $("#run-expt-modal").modal("show");
            $(".run-expt").on("keyup", function(event) {
              var configData, inputData;
              inputData = {};
              configData = {};
              $.each($("#expt-form").serializeArray(), function(i, field) {
                return inputData[field.name] = field.value;
              });
              $("#total").html((inputData.reward * inputData.max_assignments * 1.1).toFixed(2));
              $("#fee input").val((inputData.reward * inputData.max_assignments * .1).toFixed(2));
              configData["HIT Configuration"] = inputData;
              return _this.config.save(configData);
            });
            return $("#run-expt-btn").on("click", function() {
              return $.ajax({
                contentType: "application/json; charset=utf-8",
                url: "/mturk_services",
                type: "POST",
                dataType: "json",
                data: JSON.stringify({
                  mturk_request: "create_hit"
                }),
                complete: function() {
                  var hit_view;
                  $("#run-expt-modal").modal("hide");
                  hit_view = new HITView({
                    collection: new HITs
                  });
                  $("#tables").html(hit_view.render().el);
                  return updateExperimentStatus();
                },
                error: function(error) {
                  console.log(error);
                  return $("#expire-modal").modal("hide");
                }
              });
            });
          });
        });
        $("#server_off").on("click", function() {
          $("#server-off-modal").modal("show");
          return $("#shutdownServerBtn").on("click", function() {
            $("#server_status").css({
              color: "yellow"
            });
            return $.ajax({
              url: "/shutdown_psiturk",
              type: "GET",
              success: $("#server-off-modal").modal("hide")
            });
          });
        });
        $("#server_on").on("click", function() {
          return $.ajax({
            url: "/launch",
            type: "GET",
            success: $(function() {
              var socket;
              socket = io.connect("/server_status");
              socket.on("connect", function() {
                return $.ajax({
                  url: "/monitor_server"
                });
              });
              return socket.on("status", function(data) {
                if (parseInt(data) === 0) {
                  $("#server_status").css({
                    color: "green"
                  });
                  $("#server_on").css({
                    color: "grey"
                  });
                  return $("#server_off").css({
                    color: "orange"
                  });
                }
                $("#server_status").css({
                  color: "red"
                });
                $("#server_off").css({
                  color: "grey"
                });
                return $("#server_on").css({
                  color: "orange"
                });
              });
            })
          });
        });
        return this.getExperimentStatus();
      }
    };
  });
}).call(this);