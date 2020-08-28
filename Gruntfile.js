module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        paths: {
            src: {
                app: {
                    ussd_nurse_rapidpro: 'src/ussd_nurse_rapidpro.js',
                    ussd_public_rapidpro: 'src/ussd_public_rapidpro.js',
                    ussd_clinic_rapidpro: 'src/ussd_clinic_rapidpro.js',
                    ussd_popi_rapidpro: 'src/ussd_popi_rapidpro.js',
                    ussd_chw_rapidpro: 'src/ussd_chw_rapidpro.js',
                    ussd_optout_rapidpro: 'src/ussd_optout_rapidpro.js',
                    ussd_pmtct_rapidpro: 'src/ussd_pmtct_rapidpro.js',
                    ussd_ccmdd_wc_address_update: "src/ussd_ccmdd_wc_address_update.js",
                    ussd_covid19_triage: "src/ussd_covid19_triage.js",
                    ussd_higherhealth_healthcheck: "src/ussd_higherhealth_healthcheck.js",
                    ussd_tb_check: "src/ussd_tb_check.js"
                },
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
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_pmtct_rapidpro %>',
                    'src/init.js'
                ],
                ussd_ccmdd_wc_address_update: [
                    'src/index.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_ccmdd_wc_address_update %>',
                    'src/init.js'
                ],
                ussd_covid19_triage: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_covid19_triage %>',
                    'src/init.js'
                ],
                ussd_higherhealth_healthcheck: [
                    'src/index.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_higherhealth_healthcheck %>',
                    'src/init.js'
                ],
                ussd_tb_check: [
                    'src/index.js',
                    '<%= paths.src.app.ussd_tb_check %>',
                    'src/init.js'
                ],
                all: [
                    'src/**/*.js'
                ]
            },
            dest: {
                ussd_nurse_rapidpro: 'go-app-ussd_nurse_rapidpro.js',
                ussd_public_rapidpro: 'go-app-ussd_public_rapidpro.js',
                ussd_clinic_rapidpro: 'go-app-ussd_clinic_rapidpro.js',
                ussd_popi_rapidpro: 'go-app-ussd_popi_rapidpro.js',
                ussd_chw_rapidpro: 'go-app-ussd_chw_rapidpro.js',
                ussd_optout_rapidpro: 'go-app-ussd_optout_rapidpro.js',
                ussd_pmtct_rapidpro: 'go-app-ussd_pmtct_rapidpro.js',
                ussd_ccmdd_wc_address_update: 'go-app-ussd_ccmdd_wc_address_update.js',
                ussd_covid19_triage: 'go-app-ussd_covid19_triage.js',
                ussd_higherhealth_healthcheck: 'go-app-ussd_higherhealth_healthcheck.js',
                ussd_tb_check: 'go-app-ussd_tb_check.js'
            },
            test: {
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
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_pmtct_rapidpro %>',
                    'test/ussd_pmtct_rapidpro.test.js'
                ],
                ussd_ccmdd_wc_address_update: [
                    'test/setup.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_ccmdd_wc_address_update %>',
                    'test/ussd_ccmdd_wc_address_update.test.js'
                ],
                ussd_covid19_triage: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_covid19_triage %>',
                    'test/ussd_covid19_triage.test.js'
                ],
                ussd_higherhealth_healthcheck: [
                    'test/setup.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_higherhealth_healthcheck %>',
                    'test/ussd_higherhealth_healthcheck.test.js'
                ],
                ussd_tb_check: [
                    'test/setup.js',
                    '<%= paths.src.app.ussd_tb_check %>',
                    'test/ussd_tb_check.test.js'
                ],
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
            },
            ussd_ccmdd_wc_address_update: {
                src: ['<%= paths.src.ussd_ccmdd_wc_address_update %>'],
                dest: '<%= paths.dest.ussd_ccmdd_wc_address_update %>'
            },
            ussd_covid19_triage: {
                src: ['<%= paths.src.ussd_covid19_triage %>'],
                dest: '<%= paths.dest.ussd_covid19_triage %>'
            },
            ussd_higherhealth_healthcheck: {
                src: ['<%= paths.src.ussd_higherhealth_healthcheck %>'],
                dest: '<%= paths.dest.ussd_higherhealth_healthcheck %>'
            },
            ussd_tb_check: {
                src: ['<%= paths.src.ussd_tb_check %>'],
                dest: '<%= paths.dest.ussd_tb_check %>'
            },
        },

        mochaTest: {
            options: {
                reporter: 'spec',
            },
            /*
            */
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
            test_ussd_ccmdd_wc_address_update: {
                src: ['<%= paths.test.ussd_ccmdd_wc_address_update %>']
            },
            test_ussd_covid19_triage: {
                src: ['<%= paths.test.ussd_covid19_triage %>']
            },
            test_ussd_higherhealth_healthcheck: {
                src: ['<%= paths.test.ussd_higherhealth_healthcheck %>']
            },
            test_ussd_tb_check: {
                src: ['<%= paths.test.ussd_tb_check %>']
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
