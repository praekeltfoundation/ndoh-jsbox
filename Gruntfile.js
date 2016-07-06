module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        paths: {
            src: {
                app: {
                    clinic: 'src/clinic.js',
                    chw: 'src/chw.js',
                    public: 'src/public.js',
                    optout: 'src/optout.js',
                    smsinbound: 'src/smsinbound.js',
                    servicerating: 'src/servicerating.js',
                    nurse_ussd: 'src/nurse_ussd.js',
                    nurse_sms: 'src/nurse_sms.js'
                },
                clinic: [
                    'src/index.js',
                    '<%= paths.src.app.clinic %>',
                    'src/init.js'
                ],
                chw: [
                    'src/index.js',
                    '<%= paths.src.app.chw %>',
                    'src/init.js'
                ],
                public: [
                    'src/index.js',
                    '<%= paths.src.app.public %>',
                    'src/init.js'
                ],
                optout: [
                    'src/index.js',
                    '<%= paths.src.app.optout %>',
                    'src/init.js'
                ],
                smsinbound: [
                    'src/index.js',
                    '<%= paths.src.app.smsinbound %>',
                    'src/init.js'
                ],
                servicerating: [
                    'src/index.js',
                    '<%= paths.src.app.servicerating %>',
                    'src/init.js'
                ],
                nurse_ussd: [
                    'src/index.js',
                    '<%= paths.src.app.nurse_ussd %>',
                    'src/init.js'
                ],
                nurse_sms: [
                    'src/index.js',
                    '<%= paths.src.app.nurse_sms %>',
                    'src/init.js'
                ],
                all: [
                    'src/**/*.js'
                ]
            },
            dest: {
                clinic: 'go-app-clinic.js',
                chw: 'go-app-chw.js',
                public: 'go-app-public.js',
                optout: 'go-app-optout.js',
                smsinbound: 'go-app-smsinbound.js',
                servicerating: 'go-app-servicerating.js',
                nurse_ussd: 'go-app-nurse_ussd.js',
                nurse_sms: 'go-app-nurse_sms.js'
            },
            test: {
                clinic: [
                    'test/setup.js',
                    '<%= paths.src.app.clinic %>',
                    'test/clinic.test.js'
                ],
                chw: [
                    'test/setup.js',
                    '<%= paths.src.app.chw %>',
                    'test/chw.test.js'
                ],
                public: [
                    'test/setup.js',
                    '<%= paths.src.app.public %>',
                    'test/public.test.js'
                ],
                optout: [
                    'test/setup.js',
                    '<%= paths.src.app.optout %>',
                    'test/optout.test.js'
                ],
                smsinbound: [
                    'test/setup.js',
                    '<%= paths.src.app.smsinbound %>',
                    'test/smsinbound.test.js'
                ],
                servicerating: [
                    'test/setup.js',
                    '<%= paths.src.app.servicerating %>',
                    'test/servicerating.test.js'
                ],
                nurse_ussd: [
                    'test/setup.js',
                    '<%= paths.src.app.nurse_ussd %>',
                    'test/nurse_ussd.test.js'
                ],
                nurse_sms: [
                    'test/setup.js',
                    '<%= paths.src.app.nurse_sms %>',
                    'test/nurse_sms.test.js'
                ]
            }
        },

        jshint: {
            options: {jshintrc: '.jshintrc'},
            all: [
                'Gruntfile.js',
                '<%= paths.src.all %>'
            ]
        },

        watch: {
            src: {
                files: ['<%= paths.src.all %>'],
                tasks: ['build']
            }
        },

        concat: {
            clinic: {
                src: ['<%= paths.src.clinic %>'],
                dest: '<%= paths.dest.clinic %>'
            },
            chw: {
                src: ['<%= paths.src.chw %>'],
                dest: '<%= paths.dest.chw %>'
            },
            public: {
                src: ['<%= paths.src.public %>'],
                dest: '<%= paths.dest.public %>'
            },
            optout: {
                src: ['<%= paths.src.optout %>'],
                dest: '<%= paths.dest.optout %>'
            },
            smsinbound: {
                src: ['<%= paths.src.smsinbound %>'],
                dest: '<%= paths.dest.smsinbound %>'
            },
            servicerating: {
                src: ['<%= paths.src.servicerating %>'],
                dest: '<%= paths.dest.servicerating %>'
            },
            nurse_ussd: {
                src: ['<%= paths.src.nurse_ussd %>'],
                dest: '<%= paths.dest.nurse_ussd %>'
            },
            nurse_sms: {
                src: ['<%= paths.src.nurse_sms %>'],
                dest: '<%= paths.dest.nurse_sms %>'
            }
        },

        mochaTest: {
            options: {
                reporter: 'spec'
            },
            test_clinic: {
                src: ['<%= paths.test.clinic %>']
            },
            test_chw: {
                src: ['<%= paths.test.chw %>']
            },
            test_public: {
                src: ['<%= paths.test.public %>']
            },
            test_optout: {
                src: ['<%= paths.test.optout %>']
            },
            test_smsinbound: {
                src: ['<%= paths.test.smsinbound %>']
            },
            test_servicerating: {
                src: ['<%= paths.test.servicerating %>']
            },
            test_nurse_ussd: {
                src: ['<%= paths.test.nurse_ussd %>']
            },
            test_nurse_sms: {
                src: ['<%= paths.test.nurse_sms %>']
            }
        }
    });

    grunt.registerTask('test', [
        'jshint',
        'build',
        'mochaTest'
    ]);

    grunt.registerTask('build', [
        'concat'
    ]);

    grunt.registerTask('default', [
        'build',
        'test'
    ]);
};
