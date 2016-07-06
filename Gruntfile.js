module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        paths: {
            src: {
                app: {
                    ussd_clinic: 'src/ussd_clinic.js',
                    ussd_chw: 'src/ussd_chw.js',
                    ussd_public: 'src/ussd_public.js',
                    ussd_optout: 'src/ussd_optout.js',
                    sms_smsinbound: 'src/sms_smsinbound.js',
                    ussd_servicerating: 'src/ussd_servicerating.js',
                    ussd_nurse: 'src/ussd_nurse.js',
                    sms_nurse: 'src/sms_nurse.js'
                },
                ussd_clinic: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_clinic %>',
                    'src/init.js'
                ],
                ussd_chw: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_chw %>',
                    'src/init.js'
                ],
                ussd_public: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_public %>',
                    'src/init.js'
                ],
                ussd_optout: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_optout %>',
                    'src/init.js'
                ],
                sms_smsinbound: [
                    'src/index.js',
                    '<%= paths.src.app.sms_smsinbound %>',
                    'src/init.js'
                ],
                ussd_servicerating: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_servicerating %>',
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
                ussd_clinic: 'go-app-ussd_clinic.js',
                ussd_chw: 'go-app-ussd_chw.js',
                ussd_public: 'go-app-ussd_public.js',
                ussd_optout: 'go-app-ussd_optout.js',
                sms_smsinbound: 'go-app-sms_smsinbound.js',
                ussd_servicerating: 'go-app-ussd_servicerating.js',
                ussd_nurse: 'go-app-ussd_nurse.js',
                sms_nurse: 'go-app-sms_nurse.js'
            },
            test: {
                ussd_clinic: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_clinic %>',
                    'test/clinic.test.js'
                ],
                ussd_chw: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_chw %>',
                    'test/chw.test.js'
                ],
                ussd_public: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_public %>',
                    'test/public.test.js'
                ],
                ussd_optout: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_optout %>',
                    'test/optout.test.js'
                ],
                sms_smsinbound: [
                    'test/setup.js',
                    '<%= paths.src.app.sms_smsinbound %>',
                    'test/smsinbound.test.js'
                ],
                ussd_servicerating: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_servicerating %>',
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
            ussd_clinic: {
                src: ['<%= paths.src.ussd_clinic %>'],
                dest: '<%= paths.dest.ussd_clinic %>'
            },
            ussd_chw: {
                src: ['<%= paths.src.ussd_chw %>'],
                dest: '<%= paths.dest.ussd_chw %>'
            },
            ussd_public: {
                src: ['<%= paths.src.ussd_public %>'],
                dest: '<%= paths.dest.ussd_public %>'
            },
            ussd_optout: {
                src: ['<%= paths.src.ussd_optout %>'],
                dest: '<%= paths.dest.ussd_optout %>'
            },
            sms_smsinbound: {
                src: ['<%= paths.src.sms_smsinbound %>'],
                dest: '<%= paths.dest.sms_smsinbound %>'
            },
            ussd_servicerating: {
                src: ['<%= paths.src.ussd_servicerating %>'],
                dest: '<%= paths.dest.ussd_servicerating %>'
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
            test_ussd_clinic: {
                src: ['<%= paths.test.ussd_clinic %>']
            },
            test_ussd_chw: {
                src: ['<%= paths.test.ussd_chw %>']
            },
            test_ussd_public: {
                src: ['<%= paths.test.ussd_public %>']
            },
            test_ussd_optout: {
                src: ['<%= paths.test.ussd_optout %>']
            },
            test_sms_smsinbound: {
                src: ['<%= paths.test.sms_smsinbound %>']
            },
            test_ussd_servicerating: {
                src: ['<%= paths.test.ussd_servicerating %>']
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
