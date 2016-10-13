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
                    sms_inbound: 'src/sms_inbound.js',
                    ussd_servicerating: 'src/ussd_servicerating.js',
                    ussd_nurse: 'src/ussd_nurse.js',
                    sms_nurse: 'src/sms_nurse.js',
                    ussd_pmtct: 'src/ussd_pmtct.js',
                    sms_pmtct: 'src/sms_pmtct.js',
                    ussd_pmtct_seed: 'src/ussd_pmtct_seed.js',
                    sms_pmtct_seed: 'src/sms_pmtct_seed.js'
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
                sms_inbound: [
                    'src/index.js',
                    '<%= paths.src.app.sms_inbound %>',
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
                ussd_pmtct: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_pmtct %>',
                    'src/init.js'
                ],
                sms_pmtct: [
                    'src/index.js',
                    '<%= paths.src.app.sms_pmtct %>',
                    'src/init.js'
                ],
                ussd_pmtct_seed: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_pmtct_seed %>',
                    'src/init.js'
                ],
                sms_pmtct_seed: [
                    'src/index.js',
                    '<%= paths.src.app.sms_pmtct_seed %>',
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
                sms_inbound: 'go-app-sms_inbound.js',
                ussd_servicerating: 'go-app-ussd_servicerating.js',
                ussd_nurse: 'go-app-ussd_nurse.js',
                sms_nurse: 'go-app-sms_nurse.js',
                ussd_pmtct: 'go-app-ussd_pmtct.js',
                sms_pmtct: 'go-app-sms_pmtct.js',
                ussd_pmtct_seed: 'go-app-ussd_pmtct_seed.js',
                sms_pmtct_seed: 'go-app-sms_pmtct_seed.js'
            },
            test: {
                ussd_clinic: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_clinic %>',
                    'test/ussd_clinic.test.js'
                ],
                ussd_chw: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_chw %>',
                    'test/ussd_chw.test.js'
                ],
                ussd_public: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_public %>',
                    'test/ussd_public.test.js'
                ],
                ussd_optout: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_optout %>',
                    'test/ussd_optout.test.js'
                ],
                sms_inbound: [
                    'test/setup.js',
                    '<%= paths.src.app.sms_inbound %>',
                    'test/sms_inbound.test.js'
                ],
                ussd_servicerating: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_servicerating %>',
                    'test/ussd_servicerating.test.js'
                ],
                ussd_nurse: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_nurse %>',
                    'test/ussd_nurse.test.js'
                ],
                sms_nurse: [
                    'test/setup.js',
                    'src/session_length_helper.js',
                    '<%= paths.src.app.sms_nurse %>',
                    'test/sms_nurse.test.js'
                ],
                ussd_pmtct: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_pmtct %>',
                    'test/ussd_pmtct.test.js'
                ],
                sms_pmtct: [
                    'test/setup.js',
                    '<%= paths.src.app.sms_pmtct %>',
                    'test/sms_pmtct.test.js'
                ],
                ussd_pmtct_seed: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_pmtct_seed %>',
                    'test/ussd_pmtct_seed.test.js'
                ],
                sms_pmtct_seed: [
                    'test/setup.js',
                    '<%= paths.src.app.sms_pmtct_seed %>',
                    'test/sms_pmtct_seed.test.js'
                ],
                session_length_helper: [
                    'src/session_length_helper.js',
                    'test/session_length_helper.test.js'
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
            sms_inbound: {
                src: ['<%= paths.src.sms_inbound %>'],
                dest: '<%= paths.dest.sms_inbound %>'
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
            },
            ussd_pmtct: {
                src: ['<%= paths.src.ussd_pmtct %>'],
                dest: '<%= paths.dest.ussd_pmtct %>'
            },
            sms_pmtct: {
                src: ['<%= paths.src.sms_pmtct %>'],
                dest: '<%= paths.dest.sms_pmtct %>'
            },
            ussd_pmtct_seed: {
                src: ['<%= paths.src.ussd_pmtct_seed %>'],
                dest: '<%= paths.dest.ussd_pmtct_seed %>'
            },
            sms_pmtct_seed: {
                src: ['<%= paths.src.sms_pmtct_seed %>'],
                dest: '<%= paths.dest.sms_pmtct_seed %>'
            }
        },

        mochaTest: {
            options: {
                reporter: 'spec'
            },
            /*
            */
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
            test_sms_inbound: {
                src: ['<%= paths.test.sms_inbound %>']
            },
            test_ussd_servicerating: {
                src: ['<%= paths.test.ussd_servicerating %>']
            },
            test_ussd_nurse: {
                src: ['<%= paths.test.ussd_nurse %>']
            },
            test_sms_nurse: {
                src: ['<%= paths.test.sms_nurse %>']
            },
            test_ussd_pmtct: {
                src: ['<%= paths.test.ussd_pmtct %>']
            },
            test_sms_pmtct: {
                src: ['<%= paths.test.sms_pmtct %>']
            },
            test_ussd_pmtct_seed: {
                src: ['<%= paths.test.ussd_pmtct_seed %>']
            },
            test_sms_pmtct_seed: {
                src: ['<%= paths.test.sms_pmtct_seed %>']
            },
            test_session_length_helper: {
                src: ['<%= paths.test.session_length_helper %>']
            }
            /*
            */
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
