describe('controllers', function () {
  var scope, controller, $window, $httpBackend, $sce, $uibModal

  beforeEach(module('juiceShop'))
  beforeEach(function () {
    $window = {location: {replace: jasmine.createSpy()}, sessionStorage: {bid: 42}}

    module(function ($provide) {
      $provide.value('$window', $window)
    })
  })
  beforeEach(inject(function ($injector) {
    $httpBackend = $injector.get('$httpBackend')
    $httpBackend.whenGET(/\/i18n\/.*\.json/).respond(200, {})
    $httpBackend.whenGET('/rest/admin/application-configuration').respond(200, {config: {}})
    $sce = $injector.get('$sce')
    $uibModal = $injector.get('$uibModal')
  }))

  afterEach(function () {
    $httpBackend.verifyNoOutstandingExpectation()
    $httpBackend.verifyNoOutstandingRequest()
  })

  describe('BasketController', function () {
    beforeEach(inject(function ($rootScope, $window, $controller) {
      scope = $rootScope.$new()
      controller = $controller('BasketController', {
        '$scope': scope
      })
    }))

    it('should be defined', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      $httpBackend.flush()

      expect(controller).toBeDefined()
      expect(scope.delete).toBeDefined()
      expect(scope.checkout).toBeDefined()
      expect(scope.applyCoupon).toBeDefined()
      expect(scope.inc).toBeDefined()
      expect(scope.dec).toBeDefined()
    }))

    it('should hold products returned by backend API', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{description: 'a'}, {description: 'b'}]}})

      $httpBackend.flush()

      expect(scope.products).toBeDefined()
      expect(scope.products.length).toBe(2)
      expect(scope.products[0].description).toBeDefined()
      expect(scope.products[1].description).toBeDefined()
    }))

    it('should hold no products when none are returned by backend API', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})

      $httpBackend.flush()

      expect(scope.products).toEqual({})
    }))

    it('should hold no products on error in backend API', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(500)

      $httpBackend.flush()

      expect(scope.products).toBeUndefined()
    }))

    it('should pass delete request for basket item to backend API', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1}}]}})
      $httpBackend.expectDELETE('/api/BasketItems/1').respond(200, { data: {} })

      scope.delete(1)
      $httpBackend.flush()
    }))

    it('should load again after deleting a basket item', inject(function () {
      $httpBackend.expectGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1}}, {basketItem: {id: 2}}]}})
      $httpBackend.expectDELETE('/api/BasketItems/1').respond(200, { data: {} })
      $httpBackend.expectGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 2}}]}})

      scope.delete(1)
      $httpBackend.flush()
    }))

    it('should redirect to confirmation URL after ordering basket', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1}}]}})
      $httpBackend.whenPOST('/rest/basket/42/checkout').respond(200, { orderConfirmation: '/ftp/some.pdf' })

      scope.checkout()
      $httpBackend.flush()

      expect($window.location.replace).toHaveBeenCalledWith('/ftp/some.pdf')
    }))

    it('should not redirect anywhere when ordering basket fails', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1}}]}})
      $httpBackend.whenPOST('/rest/basket/42/checkout').respond(500)

      scope.checkout()
      $httpBackend.flush()

      expect($window.location.replace.mostRecentCall).toEqual({})
    }))

    it('should update basket item with increased quantity after adding another item of same type', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 1}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: 1}})
      $httpBackend.expectPUT('/api/BasketItems/1', {quantity: 2}).respond(200, {data: {id: 1, quantity: 2}})

      scope.inc(1)
      $httpBackend.flush()
    }))

    it('should not increase quantity on error retrieving basket item', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 1}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(500)

      scope.inc(1)
      $httpBackend.flush()
    }))

    it('should not increase quantity on error updating basket item', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 2}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: 2}})
      $httpBackend.whenPUT('/api/BasketItems/1', {quantity: 3}).respond(500)

      scope.inc(1)
      $httpBackend.flush()
    }))

    it('should update basket item with decreased quantity after removing an item', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 2}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: 2}})
      $httpBackend.expectPUT('/api/BasketItems/1', {quantity: 1}).respond(200, {data: {id: 1, quantity: 1}})

      scope.dec(1)
      $httpBackend.flush()
    }))

    it('should always keep one item of any product in the basket when reducing quantity via UI', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 1}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: 1}})
      $httpBackend.expectPUT('/api/BasketItems/1', {quantity: 1}).respond(200, {data: {id: 1, quantity: 1}})

      scope.dec(1)
      $httpBackend.flush()
    }))

    it('should not decrease quantity on error retrieving basket item', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 1}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(500)

      scope.dec(1)
      $httpBackend.flush()
    }))

    it('should not decrease quantity on error updating basket item', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 2}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: 2}})
      $httpBackend.whenPUT('/api/BasketItems/1', {quantity: 1}).respond(500)

      scope.dec(1)
      $httpBackend.flush()
    }))

    it('should load again after increasing product quantity', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 2}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: 2}})
      $httpBackend.whenPUT('/api/BasketItems/1', {quantity: 3}).respond(200, {data: {id: 1, quantity: 3}})
      $httpBackend.expectGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 3}}]}})

      scope.inc(1)
      $httpBackend.flush()
    }))

    it('should load again after decreasing product quantity', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 2}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: 2}})
      $httpBackend.whenPUT('/api/BasketItems/1', {quantity: 1}).respond(200, {data: {id: 1, quantity: 1}})
      $httpBackend.expectGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 1}}]}})

      scope.dec(1)
      $httpBackend.flush()
    }))

    it('should reset quantity to 1 when increasing for quantity tampered to be negative', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: -100}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: -100}})
      $httpBackend.expectPUT('/api/BasketItems/1', {quantity: 1}).respond(200, {data: {id: 1, quantity: 1}})

      scope.inc(1)
      $httpBackend.flush()
    }))

    it('should reset quantity to 1 when decreasing for quantity tampered to be negative', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: -100}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: -100}})
      $httpBackend.expectPUT('/api/BasketItems/1', {quantity: 1}).respond(200, {data: {id: 1, quantity: 1}})

      scope.dec(1)
      $httpBackend.flush()
    }))

    it('should reject an invalid coupon code', inject(function () {
      scope.form = {$setPristine: function () {}}
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      $httpBackend.whenPUT('/rest/basket/42/coupon/invalid_base85').respond(404, 'error')

      scope.coupon = 'invalid_base85'
      scope.applyCoupon()
      $httpBackend.flush()

      expect(scope.confirmation).toBeUndefined()
      expect(scope.error).toBe('error')
    }))

    it('should accept a valid coupon code', inject(function () {
      scope.form = {$setPristine: function () {}}
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      $httpBackend.whenPUT('/rest/basket/42/coupon/valid_base85').respond(200, { discount: 42 })

      scope.coupon = 'valid_base85'
      scope.applyCoupon()
      $httpBackend.flush()

      expect(scope.confirmation).toBe('DISCOUNT_APPLIED')
      expect(scope.error).toBeUndefined()
    }))

    it('should translate DISCOUNT_APPLIED message', inject(function () {
      scope.form = {$setPristine: function () {}}
      $httpBackend.expectGET(/\/i18n\/.*\.json/).respond(200, {'DISCOUNT_APPLIED': 'Translation of DISCOUNT_APPLIED'})
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      $httpBackend.whenPUT('/rest/basket/42/coupon/valid_base85').respond(200, { discount: 42 })

      scope.coupon = 'valid_base85'
      scope.applyCoupon()
      $httpBackend.flush()

      expect(scope.confirmation).toBe('Translation of DISCOUNT_APPLIED')
      expect(scope.error).toBeUndefined()
    }))

    it('should log error while increasing quantity of basket item directly to browser console', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 2}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: 2}})
      $httpBackend.whenPUT('/api/BasketItems/1', {quantity: 3}).respond(500, 'error')

      console.log = jasmine.createSpy('log')

      scope.inc(1)
      $httpBackend.flush()

      expect(console.log).toHaveBeenCalledWith('error')
    }))

    it('should log error while decreasing quantity of basket item directly to browser console', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 2}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(200, {data: {id: 1, quantity: 2}})
      $httpBackend.whenPUT('/api/BasketItems/1', {quantity: 1}).respond(500, 'error')

      console.log = jasmine.createSpy('log')

      scope.dec(1)
      $httpBackend.flush()

      expect(console.log).toHaveBeenCalledWith('error')
    }))

    it('should log error while retrieving basket item for quantity increase directly to browser console', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 1}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(500, 'error')

      console.log = jasmine.createSpy('log')

      scope.inc(1)
      $httpBackend.flush()

      expect(console.log).toHaveBeenCalledWith('error')
    }))

    it('should log error while retrieving basket item for quantity decrease directly to browser console', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1, quantity: 1}}]}})
      $httpBackend.whenGET('/api/BasketItems/1').respond(500, 'error')

      console.log = jasmine.createSpy('log')

      scope.dec(1)
      $httpBackend.flush()

      expect(console.log).toHaveBeenCalledWith('error')
    }))

    it('should log error when ordering basket fails directly to browser console', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1}}]}})
      $httpBackend.whenPOST('/rest/basket/42/checkout').respond(500, 'error')

      console.log = jasmine.createSpy('log')

      scope.checkout()
      $httpBackend.flush()

      expect(console.log).toHaveBeenCalledWith('error')
    }))

    it('should log error while deleting basket item directly to browser console', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{basketItem: {id: 1}}]}})
      $httpBackend.whenDELETE('/api/BasketItems/1').respond(500, 'error')

      console.log = jasmine.createSpy('log')

      scope.delete(1)
      $httpBackend.flush()

      expect(console.log).toHaveBeenCalledWith('error')
    }))

    it('should log error while getting products from backend API directly to browser console', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(500, 'error')

      console.log = jasmine.createSpy('log')

      $httpBackend.flush()

      expect(console.log).toHaveBeenCalledWith('error')
    }))

    it('should consider product description as trusted HTML', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: [{description: '<script>alert("XSS3")</script>'}]}})
      spyOn($sce, 'trustAsHtml')

      $httpBackend.flush()

      expect($sce.trustAsHtml).toHaveBeenCalledWith('<script>alert("XSS3")</script>')
    }))

    it('should open a modal dialog with a Bitcoin QR code', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      spyOn($uibModal, 'open')

      $httpBackend.flush()

      scope.showBitcoinQrCode()

      expect($uibModal.open).toHaveBeenCalledWith({templateUrl: 'views/QrCode.html', controller: 'QrCodeController', size: 'md', resolve: { data: jasmine.any(Function), url: jasmine.any(Function), address: jasmine.any(Function), title: jasmine.any(Function) }})
      expect($uibModal.open.calls[0].args[0].resolve.data()).toMatch(/bitcoin:.*/)
      expect($uibModal.open.calls[0].args[0].resolve.url()).toMatch(/\/redirect\?to=https:\/\/blockchain\.info\/address\/.*/)
      expect($uibModal.open.calls[0].args[0].resolve.title()).toBe('TITLE_BITCOIN_ADDRESS')
      expect($uibModal.open.calls[0].args[0].resolve.address()).toBeDefined()
    }))

    it('should open a modal dialog with a Dash QR code', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      spyOn($uibModal, 'open')

      $httpBackend.flush()

      scope.showDashQrCode()

      expect($uibModal.open).toHaveBeenCalledWith({templateUrl: 'views/QrCode.html', controller: 'QrCodeController', size: 'md', resolve: { data: jasmine.any(Function), url: jasmine.any(Function), address: jasmine.any(Function), title: jasmine.any(Function) }})
      expect($uibModal.open.calls[0].args[0].resolve.data()).toMatch(/dash:.*/)
      expect($uibModal.open.calls[0].args[0].resolve.url()).toMatch(/\/redirect\?to=https:\/\/explorer\.dash\.org\/address\/.*/)
      expect($uibModal.open.calls[0].args[0].resolve.title()).toBe('TITLE_DASH_ADDRESS')
      expect($uibModal.open.calls[0].args[0].resolve.address()).toBeDefined()
    }))

    it('should open a modal dialog with an Ether QR code', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      spyOn($uibModal, 'open')

      $httpBackend.flush()

      scope.showEtherQrCode()

      expect($uibModal.open).toHaveBeenCalledWith({templateUrl: 'views/QrCode.html', controller: 'QrCodeController', size: 'md', resolve: { data: jasmine.any(Function), url: jasmine.any(Function), address: jasmine.any(Function), title: jasmine.any(Function) }})
      expect($uibModal.open.calls[0].args[0].resolve.data()).toMatch(/0x.*/)
      expect($uibModal.open.calls[0].args[0].resolve.url()).toMatch(/https:\/\/etherscan\.io\/address\/.*/)
      expect($uibModal.open.calls[0].args[0].resolve.title()).toBe('TITLE_ETHER_ADDRESS')
      expect($uibModal.open.calls[0].args[0].resolve.address()).toBeDefined()
    }))

    it('should use default twitter and facebook URLs if not customized', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      $httpBackend.expectGET('/rest/admin/application-configuration').respond(200, {config: {}})

      $httpBackend.flush()

      expect(scope.twitterUrl).toBe('https://twitter.com/owasp_juiceshop')
      expect(scope.facebookUrl).toBe('https://www.facebook.com/owasp.juiceshop')
    }))

    it('should use custom twitter URL if configured', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      $httpBackend.expectGET('/rest/admin/application-configuration').respond(200, {config: {application: {twitterUrl: 'twitter'}}})

      $httpBackend.flush()

      expect(scope.twitterUrl).toBe('twitter')
    }))

    it('should use custom facebook URL if configured', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      $httpBackend.expectGET('/rest/admin/application-configuration').respond(200, {config: {application: {facebookUrl: 'facebook'}}})

      $httpBackend.flush()

      expect(scope.facebookUrl).toBe('facebook')
    }))

    it('should log error while getting application configuration from backend API directly to browser console', inject(function () {
      $httpBackend.whenGET('/rest/basket/42').respond(200, {data: {products: []}})
      $httpBackend.expectGET('/rest/admin/application-configuration').respond(500, 'error')

      console.log = jasmine.createSpy('log')

      $httpBackend.flush()

      expect(console.log).toHaveBeenCalledWith('error')
    }))
  })
})
