'use strict';

/**
 * The directive app:view is more powerful replacement of built-in ng:view. It allows views to be nested, where each
 * following view in the chain corresponds to the next route segment (see $routeSegment service).
 *
 * Sample:
 * <div>
 *     <h4>Section</h4>
 *     <div app:view>Nothing selected</div>
 * </div>
 *
 * Initial contents of an element with app:view will display if corresponding route segment doesn't exist.
 *
 * View resolving are depends on route segment params:
 * - `template` define contents of the view
 * - `controller` is attached to view contents when compiled and linked
 */

(function(angular) {

    angular.module( 'view-segment', [ 'route-segment' ] ).directive( 'appViewSegment',
    ['$route', '$compile', '$controller', '$routeParams', '$routeSegment', '$q', '$injector', '$window',
        function($route, $compile, $controller, $routeParams, $routeSegment, $q, $injector, $window) {

            return {
                restrict : 'ECA',
                priority: 500,
                compile : function(tElement, tAttrs) {

                    var defaultContent = tElement.html(), isDefault = true,
                    anchor = angular.element(document.createComment(' view-segment '));

                    tElement.prepend(anchor);

                    return function($scope) {

                        var currentScope, currentElement, onloadExp = tAttrs.onload || '', animate,
                        viewSegmentIndex = parseInt(tAttrs.appViewSegment);

                        try {
                            // angular 1.1.x
                            var $animator = $injector.get('$animator')
                            animate = $animator($scope, tAttrs);
                        }
                        catch(e) {}
                        try {
                            // angular 1.2.x
                            animate = $injector.get('$animate');
                        }
                        catch(e) {}

                        if($routeSegment.chain[viewSegmentIndex])
                            update($routeSegment.chain[viewSegmentIndex]);

                        // Watching for the specified route segment and updating contents
                        $scope.$on('routeSegmentChange', function(event, args) {
                            if(args.index == viewSegmentIndex)
                                update(args.segment);
                        });

                        function clearContent() {

                            if(currentElement) {
                                animate.leave(currentElement);
                                currentElement = null;
                            }

                            if (currentScope) {
                                currentScope.$destroy();
                                currentScope = null;
                            }
                        }


                        function update(segment) {

                            if(isDefault) {
                                isDefault = false;
                                tElement.replaceWith(anchor);
                            }

                            if(!segment) {
                                clearContent();
                                currentElement = tElement.clone();
                                currentElement.html(defaultContent);
                                animate.enter( currentElement, null, anchor );
                                $compile(currentElement, false, 499)($scope);
                                return;
                            }

                            var locals = angular.extend({}, segment.locals),
                            template = locals && locals.$template;

                            if (template) {

                                clearContent();

                                currentElement = tElement.clone();

                                if (segment.params.modal) {
                                  // if segment has modal flag, put modal dialog nodes around it
                                  currentElement.addClass('modal');
                                  currentElement.html('<div class="modal-dialog"><div class="modal-content"><div class="modal-body"></div><div class="modal-footer"><a class="btn btn-default" ng-href="/new/{{secondTopSegmentUrl}}">Schliessen</a></div></div></div>');
                                  $('.modal-body', currentElement).html(template);
                                } else {
                                  currentElement.html(template);
                                }

                                animate.enter( currentElement, null, anchor );

                                var link = $compile(currentElement, false, 499), controller;

                                currentScope = $scope.$new();

                                // add the scope of the parent segment to this segment's scope
                                if (viewSegmentIndex > 0) {
                                  var viewNode = $window.document.querySelector('[app-view-segment="' + (viewSegmentIndex - 1) + '"]');
                                  if (angular.isDefined(viewNode)) {
                                    currentScope.$parentSegmentScope = angular.element(viewNode).scope();
                                  }
                                }

                                if (segment.params.controller) {
                                    locals.$scope = currentScope;
                                    controller = $controller(segment.params.controller, locals);
                                    if(segment.params.controllerAs)
                                        currentScope[segment.params.controllerAs] = controller;
                                    currentElement.data('$ngControllerController', controller);
                                    currentElement.children().data('$ngControllerController', controller);
                                }

                                link(currentScope);
                                currentScope.$emit('$viewContentLoaded');
                                currentScope.$eval(onloadExp);
                            } else {
                                clearContent();
                            }
                        }
                    }
                }
            }
        }]);

})(angular);