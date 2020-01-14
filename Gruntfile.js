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
                    ussd_pmtct_seed: 'src/ussd_pmtct_seed.js',
                    ussd_popi_faq: 'src/ussd_popi_faq.js',
                    ussd_popi_user_data: 'src/ussd_popi_user_data.js',
                    ussd_nurse_rapidpro: 'src/ussd_nurse_rapidpro.js',
                    ussd_public_rapidpro: 'src/ussd_public_rapidpro.js',
                    ussd_clinic_rapidpro: 'src/ussd_clinic_rapidpro.js',
                    ussd_popi_rapidpro: 'src/ussd_popi_rapidpro.js',
                    ussd_chw_rapidpro: 'src/ussd_chw_rapidpro.js',
                    ussd_optout_rapidpro: 'src/ussd_optout_rapidpro.js',
                    ussd_pmtct_rapidpro: 'src/ussd_pmtct_rapidpro.js'
                },
                ussd_clinic: [
                    'src/index.js',
                    'src/session_length_helper.js',
                    'src/engage.js',
                    '<%= paths.src.app.ussd_clinic %>',
                    'src/init.js'
                ],
                ussd_chw: [
                    'src/index.js',
                    'src/session_length_helper.js',
                    'src/engage.js',
                    '<%= paths.src.app.ussd_chw %>',
                    'src/init.js'
                ],
                ussd_public: [
                    'src/index.js',
                    'src/session_length_helper.js',
                    'src/engage.js',
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
                    'src/session_length_helper.js',
                    '<%= paths.src.app.sms_inbound %>',
                    'src/init.js'
                ],
                ussd_pmtct_seed: [
                    'src/index.js',
                    'src/engage.js',
                    '<%= paths.src.app.ussd_pmtct_seed %>',
                    'src/init.js'
                ],
                ussd_popi_faq: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_popi_faq %>',
                    'src/init.js'
                ],
                ussd_popi_user_data: [
                    'src/index.js',
                    'src/engage.js',
                    '<%= paths.src.app.ussd_popi_user_data %>',
                    'src/init.js'
                ],
                ussd_nurse_rapidpro: [
                    'src/index.js',
                    'src/rapidpro.js',
                    'src/openhim.js',
                    '<%= paths.src.app.ussd_nurse_rapidpro %>',
                    'src/init.js'
                ],
                ussd_public_rapidpro: [
                    'src/index.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_public_rapidpro %>',
                    'src/init.js'
                ],
                ussd_clinic_rapidpro: [
                    'src/index.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    'src/openhim.js',
                    '<%= paths.src.app.ussd_clinic_rapidpro %>',
                    'src/init.js'
                ],
                ussd_popi_rapidpro: [
                    'src/index.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_popi_rapidpro %>',
                    'src/init.js'
                ],
                ussd_chw_rapidpro: [
                    'src/index.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_chw_rapidpro %>',
                    'src/init.js'
                ],
                ussd_optout_rapidpro: [
                    'src/index.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_optout_rapidpro %>',
                    'src/init.js'
                ],
                ussd_pmtct_rapidpro: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_pmtct_rapidpro %>',
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
                ussd_pmtct_seed: 'go-app-ussd_pmtct_seed.js',
                ussd_popi_faq: 'go-app-ussd_popi_faq.js',
                ussd_popi_user_data: 'go-app-ussd_popi_user_data.js',
                ussd_nurse_rapidpro: 'go-app-ussd_nurse_rapidpro.js',
                ussd_public_rapidpro: 'go-app-ussd_public_rapidpro.js',
                ussd_clinic_rapidpro: 'go-app-ussd_clinic_rapidpro.js',
                ussd_popi_rapidpro: 'go-app-ussd_popi_rapidpro.js',
                ussd_chw_rapidpro: 'go-app-ussd_chw_rapidpro.js',
                ussd_optout_rapidpro: 'go-app-ussd_optout_rapidpro.js',
                ussd_pmtct_rapidpro: 'go-app-ussd_pmtct_rapidpro.js'
            },
            test: {
                ussd_clinic: [
                    'test/setup.js',
                    'src/session_length_helper.js',
                    'src/engage.js',
                    '<%= paths.src.app.ussd_clinic %>',
                    'test/ussd_clinic.test.js'
                ],
                ussd_chw: [
                    'test/setup.js',
                    'src/session_length_helper.js',
                    'src/engage.js',
                    '<%= paths.src.app.ussd_chw %>',
                    'test/ussd_chw.test.js'
                ],
                ussd_public: [
                    'test/setup.js',
                    'src/session_length_helper.js',
                    'src/engage.js',
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
                    'src/session_length_helper.js',
                    '<%= paths.src.app.sms_inbound %>',
                    'test/sms_inbound.test.js'
                ],
                ussd_pmtct_seed: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_pmtct_seed %>',
                    'test/ussd_pmtct_seed.test.js'
                ],
                ussd_popi_faq: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_popi_faq %>',
                    'test/ussd_popi_faq.test.js'
                ],
                ussd_popi_user_data: [
                    'test/setup.js',
                    'src/engage.js',
                    '<%= paths.src.app.ussd_popi_user_data %>',
                    'test/ussd_popi_user_data.test.js'
                ],
                ussd_nurse_rapidpro: [
                    'test/setup.js',
                    'src/rapidpro.js',
                    'src/openhim.js',
                    '<%= paths.src.app.ussd_nurse_rapidpro %>',
                    'test/ussd_nurse_rapidpro.test.js'
                ],
                ussd_public_rapidpro: [
                    'test/setup.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_public_rapidpro %>',
                    'test/ussd_public_rapidpro.test.js'
                ],
                ussd_clinic_rapidpro: [
                    'test/setup.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    'src/openhim.js',
                    '<%= paths.src.app.ussd_clinic_rapidpro %>',
                    'test/ussd_clinic_rapidpro.test.js'
                ],
                ussd_popi_rapidpro: [
                    'test/setup.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_popi_rapidpro %>',
                    'test/ussd_popi_rapidpro.test.js'
                ],
                ussd_chw_rapidpro: [
                    'test/setup.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_chw_rapidpro %>',
                    'test/ussd_chw_rapidpro.test.js'
                ],
                ussd_optout_rapidpro: [
                    'test/setup.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_optout_rapidpro %>',
                    'test/ussd_optout_rapidpro.test.js'
                ],
                ussd_pmtct_rapidpro: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_pmtct_rapidpro %>',
                    'test/ussd_pmtct_rapidpro.test.js'
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
                '<%= paths.src.all %>',
                'test/*.js',
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
            ussd_pmtct_seed: {
                src: ['<%= paths.src.ussd_pmtct_seed %>'],
                dest: '<%= paths.dest.ussd_pmtct_seed %>'
            },
            ussd_popi_faq: {
                src: ['<%= paths.src.ussd_popi_faq %>'],
                dest: '<%= paths.dest.ussd_popi_faq %>'
            },
            ussd_popi_user_data: {
                src: ['<%= paths.src.ussd_popi_user_data %>'],
                dest: '<%= paths.dest.ussd_popi_user_data %>'
            },
            ussd_nurse_rapidpro: {
                src: ['<%= paths.src.ussd_nurse_rapidpro %>'],
                dest: '<%= paths.dest.ussd_nurse_rapidpro %>'
            },
            ussd_public_rapidpro: {
                src: ['<%= paths.src.ussd_public_rapidpro %>'],
                dest: '<%= paths.dest.ussd_public_rapidpro %>'
            },
            ussd_clinic_rapidpro: {
                src: ['<%= paths.src.ussd_clinic_rapidpro %>'],
                dest: '<%= paths.dest.ussd_clinic_rapidpro %>'
            },
            ussd_popi_rapidpro: {
                src: ['<%= paths.src.ussd_popi_rapidpro %>'],
                dest: '<%= paths.dest.ussd_popi_rapidpro %>'
            },
            ussd_chw_rapidpro: {
                src: ['<%= paths.src.ussd_chw_rapidpro %>'],
                dest: '<%= paths.dest.ussd_chw_rapidpro %>'
             },
            ussd_optout_rapidpro: {
                src: ['<%= paths.src.ussd_optout_rapidpro %>'],
                dest: '<%= paths.dest.ussd_optout_rapidpro %>'
            },
            ussd_pmtct_rapidpro: {
                src: ['<%= paths.src.ussd_pmtct_rapidpro %>'],
                dest: '<%= paths.dest.ussd_pmtct_rapidpro %>'
            }
        },

        mochaTest: {
            options: {
                reporter: 'spec',
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
            test_ussd_pmtct_seed: {
                src: ['<%= paths.test.ussd_pmtct_seed %>']
            },
            test_ussd_popi_faq: {
                src: ['<%= paths.test.ussd_popi_faq %>']
            },
            test_ussd_popi_user_data: {
                src: ['<%= paths.test.ussd_popi_user_data %>']
            },
            test_ussd_nurse_rapidpro: {
                src: ['<%= paths.test.ussd_nurse_rapidpro %>']
            },
            test_ussd_public_rapidpro: {
                src: ['<%= paths.test.ussd_public_rapidpro %>']
            },
            test_ussd_clinic_rapidpro: {
                src: ['<%= paths.test.ussd_clinic_rapidpro %>']
            },
            test_ussd_popi_rapidpro: {
                src: ['<%= paths.test.ussd_popi_rapidpro %>']
            },
            test_ussd_chw_rapidpro: {
                src: ['<%= paths.test.ussd_chw_rapidpro %>']
            },
            test_ussd_optout_rapidpro: {
                src: ['<%= paths.test.ussd_optout_rapidpro %>']
            },
            test_ussd_pmtct_rapidpro: {
                src: ['<%= paths.test.ussd_pmtct_rapidpro %>']
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
