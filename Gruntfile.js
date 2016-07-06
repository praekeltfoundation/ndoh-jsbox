module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        paths: {
            src: {
                app: {
                    clinic: 'src/ussd_clinic.js',
                    chw: 'src/ussd_chw.js',
                    public: 'src/ussd_public.js',
                    optout: 'src/ussd_optout.js',
                    smsinbound: 'src/sms_smsinbound.js',
                    servicerating: 'src/ussd_servicerating.js',
                    ussd_nurse: 'src/ussd_nurse.js',
                    sms_nurse: 'src/sms_nurse.js'
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
                ussd_nurse: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_nurse %>',
                    'src/init.js'
                ],
                sms_nurse: [
                    'src/index.js',
                    '<%= paths.src.app.sms_nurse %>',
                    'src/init.js'
                ],
                all: [
                    'src/**/*.js'
                ]
            },
            dest: {
                clinic: 'go-app-ussd_clinic.js',
                chw: 'go-app-ussd_chw.js',
                public: 'go-app-ussd_public.js',
                optout: 'go-app-ussd_optout.js',
                smsinbound: 'go-app-sms_smsinbound.js',
                servicerating: 'go-app-ussd_servicerating.js',
                ussd_nurse: 'go-app-ussd_nurse.js',
                sms_nurse: 'go-app-sms_nurse.js'
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
                ussd_nurse: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_nurse %>',
                    'test/ussd_nurse.test.js'
                ],
                sms_nurse: [
                    'test/setup.js',
                    '<%= paths.src.app.sms_nurse %>',
                    'test/sms_nurse.test.js'
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
            ussd_nurse: {
                src: ['<%= paths.src.ussd_nurse %>'],
                dest: '<%= paths.dest.ussd_nurse %>'
            },
            sms_nurse: {
                src: ['<%= paths.src.sms_nurse %>'],
                dest: '<%= paths.dest.sms_nurse %>'
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
            test_ussd_nurse: {
                src: ['<%= paths.test.ussd_nurse %>']
            },
            test_sms_nurse: {
                src: ['<%= paths.test.sms_nurse %>']
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
